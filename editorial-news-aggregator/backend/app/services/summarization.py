import logging
import asyncio
import aiohttp
from typing import List, Dict, Optional, Tuple
import openai
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline
import torch
from datetime import datetime
import hashlib
import json
import re

from app.core.config import settings
from app.models.article import Article

logger = logging.getLogger(__name__)


class SummarizationService:
    """
    AI-powered text summarization service supporting multiple models
    """

    def __init__(self):
        self.openai_client = None
        self.local_models = {}
        self.model_configs = {
            'bart-large-cnn': {
                'model_name': 'facebook/bart-large-cnn',
                'max_input_length': 1024,
                'max_output_length': 150,
                'min_output_length': 50,
                'type': 'huggingface'
            },
            'pegasus-xsum': {
                'model_name': 'google/pegasus-xsum',
                'max_input_length': 512,
                'max_output_length': 128,
                'min_output_length': 32,
                'type': 'huggingface'
            },
            't5-small': {
                'model_name': 't5-small',
                'max_input_length': 512,
                'max_output_length': 150,
                'min_output_length': 50,
                'type': 'huggingface'
            },
            'gpt-3.5-turbo': {
                'model_name': 'gpt-3.5-turbo',
                'max_input_length': 4000,
                'max_output_length': 200,
                'min_output_length': 50,
                'type': 'openai'
            },
            'gpt-4': {
                'model_name': 'gpt-4',
                'max_input_length': 8000,
                'max_output_length': 300,
                'min_output_length': 50,
                'type': 'openai'
            }
        }
        self._initialize_models()

    def _initialize_models(self):
        """Initialize AI models for summarization"""
        try:
            # Initialize OpenAI client if API key is available
            if settings.OPENAI_API_KEY:
                openai.api_key = settings.OPENAI_API_KEY
                self.openai_client = openai
                logger.info("OpenAI client initialized")

            # Initialize local Hugging Face models
            self._load_local_models()

        except Exception as e:
            logger.error(f"Error initializing summarization models: {str(e)}")

    def _load_local_models(self):
        """Load local Hugging Face models"""
        try:
            # Load default model (BART)
            default_model = settings.DEFAULT_SUMMARY_MODEL
            if default_model in self.model_configs:
                self._load_huggingface_model(default_model)
                logger.info(f"Loaded default summarization model: {default_model}")
        except Exception as e:
            logger.error(f"Error loading local models: {str(e)}")

    def _load_huggingface_model(self, model_key: str):
        """Load a specific Hugging Face model"""
        try:
            config = self.model_configs[model_key]
            model_name = config['model_name']

            # Check if model is already loaded
            if model_key in self.local_models:
                return

            logger.info(f"Loading Hugging Face model: {model_name}")

            # Load tokenizer and model
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

            # Create summarization pipeline
            summarizer = pipeline(
                "summarization",
                model=model,
                tokenizer=tokenizer,
                device=0 if torch.cuda.is_available() else -1
            )

            self.local_models[model_key] = {
                'summarizer': summarizer,
                'tokenizer': tokenizer,
                'model': model,
                'config': config
            }

            logger.info(f"Successfully loaded model: {model_name}")

        except Exception as e:
            logger.error(f"Error loading Hugging Face model {model_key}: {str(e)}")

    async def summarize_article(
        self,
        article: Article,
        model_name: str = None,
        custom_prompt: str = None
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Summarize a single article

        Args:
            article: Article object to summarize
            model_name: Model to use for summarization
            custom_prompt: Custom prompt for summarization

        Returns:
            Tuple of (success, summary, error_message)
        """
        try:
            # Use default model if not specified
            if not model_name:
                model_name = settings.DEFAULT_SUMMARY_MODEL.split('/')[-1]
                if model_name not in self.model_configs:
                    model_name = 'bart-large-cnn'

            # Get article content
            content = article.content
            if not content or len(content.strip()) < 100:
                return False, None, "Article content too short for summarization"

            # Prepare content for summarization
            prepared_content = self._prepare_content_for_summarization(
                content,
                article.title,
                model_name
            )

            # Choose summarization method based on model type
            config = self.model_configs.get(model_name)
            if not config:
                return False, None, f"Unknown model: {model_name}"

            if config['type'] == 'openai':
                success, summary, error = await self._summarize_with_openai(
                    prepared_content,
                    model_name,
                    custom_prompt,
                    article.language
                )
            else:
                success, summary, error = await self._summarize_with_huggingface(
                    prepared_content,
                    model_name
                )

            if success and summary:
                # Post-process summary
                summary = self._post_process_summary(summary, article.language)

                # Update article
                article.summary = summary
                article.is_summary_generated = True
                article.update_metadata('summarization_model', model_name)
                article.update_metadata('summarization_timestamp', datetime.utcnow().isoformat())

                logger.info(f"Successfully summarized article: {article.id}")
                return True, summary, None
            else:
                return False, None, error

        except Exception as e:
            error_msg = f"Summarization failed for article {article.id}: {str(e)}"
            logger.error(error_msg)
            return False, None, error_msg

    async def _summarize_with_openai(
        self,
        content: str,
        model_name: str,
        custom_prompt: str = None,
        language: str = 'en'
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Summarize content using OpenAI API"""
        try:
            if not self.openai_client or not settings.OPENAI_API_KEY:
                return False, None, "OpenAI client not available"

            # Prepare prompt
            if custom_prompt:
                prompt = custom_prompt.replace('{content}', content)
            else:
                prompt = self._get_default_prompt(content, language)

            config = self.model_configs[model_name]

            # Make API call
            response = await asyncio.to_thread(
                self.openai_client.ChatCompletion.create,
                model=config['model_name'],
                messages=[
                    {
                        "role": "system",
                        "content": f"You are a professional news editor. Summarize the following editorial/opinion article in {language}. Keep the summary concise but comprehensive, capturing the main arguments and key points."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=config['max_output_length'],
                temperature=0.3,
                top_p=1.0,
                frequency_penalty=0.0,
                presence_penalty=0.0
            )

            if response and response.choices:
                summary = response.choices[0].message.content.strip()
                return True, summary, None
            else:
                return False, None, "Empty response from OpenAI"

        except Exception as e:
            error_msg = f"OpenAI summarization error: {str(e)}"
            logger.error(error_msg)
            return False, None, error_msg

    async def _summarize_with_huggingface(
        self,
        content: str,
        model_name: str
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Summarize content using Hugging Face models"""
        try:
            # Load model if not already loaded
            if model_name not in self.local_models:
                self._load_huggingface_model(model_name)

            if model_name not in self.local_models:
                return False, None, f"Failed to load model: {model_name}"

            model_data = self.local_models[model_name]
            summarizer = model_data['summarizer']
            config = model_data['config']

            # Prepare input
            max_length = min(len(content.split()), config['max_input_length'])

            # Generate summary
            summary_result = await asyncio.to_thread(
                summarizer,
                content,
                max_length=config['max_output_length'],
                min_length=config['min_output_length'],
                do_sample=False,
                truncation=True
            )

            if summary_result and isinstance(summary_result, list) and summary_result[0]:
                summary = summary_result[0]['summary_text']
                return True, summary, None
            else:
                return False, None, "Empty result from Hugging Face model"

        except Exception as e:
            error_msg = f"Hugging Face summarization error: {str(e)}"
            logger.error(error_msg)
            return False, None, error_msg

    def _prepare_content_for_summarization(
        self,
        content: str,
        title: str,
        model_name: str
    ) -> str:
        """Prepare article content for summarization"""
        try:
            config = self.model_configs.get(model_name)
            if not config:
                config = self.model_configs['bart-large-cnn']

            # Clean content
            cleaned_content = self._clean_content(content)

            # Combine title and content
            full_text = f"{title}\n\n{cleaned_content}"

            # Truncate if necessary based on model limits
            max_length = config['max_input_length']
            if len(full_text.split()) > max_length:
                words = full_text.split()[:max_length]
                full_text = ' '.join(words)

            return full_text

        except Exception as e:
            logger.error(f"Error preparing content: {str(e)}")
            return content

    def _clean_content(self, content: str) -> str:
        """Clean content for better summarization"""
        if not content:
            return ""

        # Remove extra whitespace
        content = re.sub(r'\s+', ' ', content)

        # Remove common noise patterns
        patterns = [
            r'\[.*?\]',  # Remove brackets
            r'\(Reuters\)',  # Remove agency tags
            r'\(AP\)',
            r'\(PTI\)',
            r'Read more:.*',  # Remove "read more" sections
            r'Also read:.*',
            r'Click here.*',
            r'Subscribe.*',
        ]

        for pattern in patterns:
            content = re.sub(pattern, '', content, flags=re.IGNORECASE)

        return content.strip()

    def _post_process_summary(self, summary: str, language: str = 'en') -> str:
        """Post-process generated summary"""
        if not summary:
            return ""

        # Clean up the summary
        summary = summary.strip()

        # Remove common artifacts
        artifacts = [
            'Summary:',
            'In summary,',
            'To summarize,',
            'In conclusion,',
        ]

        for artifact in artifacts:
            if summary.startswith(artifact):
                summary = summary[len(artifact):].strip()

        # Ensure proper sentence ending
        if summary and not summary.endswith(('.', '!', '?')):
            summary += '.'

        # Remove extra spaces
        summary = re.sub(r'\s+', ' ', summary)

        return summary

    def _get_default_prompt(self, content: str, language: str) -> str:
        """Get default summarization prompt"""
        prompts = {
            'en': f"Please provide a concise summary of this editorial article in 2-3 sentences. Focus on the main argument, key points, and conclusion:\n\n{content}",
            'hi': f"कृपया इस संपादकीय लेख का संक्षिप्त सारांश 2-3 वाक्यों में प्रदान करें। मुख्य तर्क, मुख्य बिंदुओं और निष्कर्ष पर ध्यान दें:\n\n{content}",
            'bn': f"অনুগ্রহ করে এই সম্পাদকীয় নিবন্ধের একটি সংক্ষিপ্ত সারসংক্ষেপ ২-৩ বাক্যে প্রদান করুন। মূল যুক্তি, মূল বিষয় এবং উপসংহারের উপর মনোযোগ দিন:\n\n{content}",
            'ta': f"இந்த ஆசிரியர் கட்டுரையின் சுருக்கமான சுருக்கத்தை 2-3 வாக்கியங்களில் வழங்கவும். முக்கிய வாதம், முக்கிய புள்ளிகள் மற்றும் முடிவில் கவனம் செலுத்துங்கள்:\n\n{content}",
            'mr': f"कृपया या संपादकीय लेखाचा संक्षिप्त सारांश 2-3 वाक्यात द्या. मुख्य युक्तिवाद, मुख्य मुद्दे आणि निष्कर्षावर लक्ष केंद्रित करा:\n\n{content}",
        }

        return prompts.get(language, prompts['en'])

    async def batch_summarize_articles(
        self,
        articles: List[Article],
        model_name: str = None,
        batch_size: int = None
    ) -> Dict[str, Tuple[bool, Optional[str], Optional[str]]]:
        """
        Summarize multiple articles in batches

        Args:
            articles: List of articles to summarize
            model_name: Model to use for summarization
            batch_size: Number of articles to process in each batch

        Returns:
            Dictionary mapping article IDs to (success, summary, error_message)
        """
        if not batch_size:
            batch_size = settings.SUMMARY_BATCH_SIZE

        results = {}

        try:
            # Process articles in batches
            for i in range(0, len(articles), batch_size):
                batch = articles[i:i + batch_size]

                # Create tasks for concurrent processing
                tasks = []
                for article in batch:
                    task = self.summarize_article(article, model_name)
                    tasks.append((article.id, task))

                # Execute batch
                batch_results = await asyncio.gather(
                    *[task for _, task in tasks],
                    return_exceptions=True
                )

                # Process results
                for j, (article_id, _) in enumerate(tasks):
                    result = batch_results[j]
                    if isinstance(result, Exception):
                        results[str(article_id)] = (False, None, str(result))
                    else:
                        results[str(article_id)] = result

                logger.info(f"Processed batch {i//batch_size + 1}, articles: {len(batch)}")

        except Exception as e:
            logger.error(f"Batch summarization error: {str(e)}")
            # Mark remaining articles as failed
            for article in articles:
                if str(article.id) not in results:
                    results[str(article.id)] = (False, None, f"Batch processing error: {str(e)}")

        return results

    def get_available_models(self) -> List[Dict]:
        """Get list of available summarization models"""
        models = []

        for key, config in self.model_configs.items():
            model_info = {
                'key': key,
                'name': config['model_name'],
                'type': config['type'],
                'max_input_length': config['max_input_length'],
                'max_output_length': config['max_output_length'],
                'available': False
            }

            # Check availability
            if config['type'] == 'openai' and self.openai_client:
                model_info['available'] = True
            elif config['type'] == 'huggingface' and key in self.local_models:
                model_info['available'] = True

            models.append(model_info)

        return models

    def get_model_performance_stats(self, model_name: str) -> Dict:
        """Get performance statistics for a model"""
        # This would typically come from a database or monitoring system
        # For now, return placeholder data
        return {
            'model_name': model_name,
            'total_summarizations': 0,
            'success_rate': 0.0,
            'avg_processing_time': 0.0,
            'avg_summary_length': 0,
            'last_used': None,
        }

    async def evaluate_summary_quality(
        self,
        original_text: str,
        summary: str,
        language: str = 'en'
    ) -> Dict[str, float]:
        """
        Evaluate summary quality using various metrics

        Args:
            original_text: Original article text
            summary: Generated summary
            language: Text language

        Returns:
            Dictionary of quality metrics
        """
        try:
            metrics = {}

            # Length-based metrics
            original_words = len(original_text.split())
            summary_words = len(summary.split())

            metrics['compression_ratio'] = summary_words / original_words if original_words > 0 else 0
            metrics['summary_length'] = summary_words

            # Basic readability (simple heuristic)
            sentences = summary.split('.')
            avg_sentence_length = summary_words / len(sentences) if sentences else 0
            metrics['avg_sentence_length'] = avg_sentence_length
            metrics['readability_score'] = min(1.0, max(0.0, (20 - avg_sentence_length) / 10))

            # Coverage metrics (keyword overlap)
            original_keywords = set(re.findall(r'\b\w{4,}\b', original_text.lower()))
            summary_keywords = set(re.findall(r'\b\w{4,}\b', summary.lower()))

            if original_keywords:
                keyword_coverage = len(summary_keywords.intersection(original_keywords)) / len(original_keywords)
                metrics['keyword_coverage'] = keyword_coverage
            else:
                metrics['keyword_coverage'] = 0.0

            # Overall quality score (simple heuristic)
            quality_score = (
                metrics.get('readability_score', 0) * 0.3 +
                metrics.get('keyword_coverage', 0) * 0.4 +
                (1.0 if 0.05 <= metrics.get('compression_ratio', 0) <= 0.3 else 0.5) * 0.3
            )
            metrics['overall_quality'] = quality_score

            return metrics

        except Exception as e:
            logger.error(f"Error evaluating summary quality: {str(e)}")
            return {}

    def generate_summary_hash(self, content: str, model_name: str) -> str:
        """Generate hash for summary caching"""
        combined = f"{content}{model_name}"
        return hashlib.md5(combined.encode('utf-8')).hexdigest()
