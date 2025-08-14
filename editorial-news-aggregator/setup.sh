#!/bin/bash

# Editorial News Aggregator - Setup Script
# This script sets up the development environment and prepares the project for deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_NAME="Editorial News Aggregator"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
ENV_FILE="$PROJECT_DIR/.env"
ENV_EXAMPLE="$PROJECT_DIR/.env.example"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check system requirements
check_requirements() {
    print_status "Checking system requirements..."

    local missing_deps=()

    # Check for required commands
    if ! command_exists python3; then
        missing_deps+=("python3")
    fi

    if ! command_exists pip3; then
        missing_deps+=("pip3")
    fi

    if ! command_exists node; then
        missing_deps+=("node.js")
    fi

    if ! command_exists npm; then
        missing_deps+=("npm")
    fi

    if ! command_exists docker; then
        print_warning "Docker not found. Docker setup will be skipped."
    fi

    if ! command_exists docker-compose; then
        print_warning "Docker Compose not found. Docker setup will be skipped."
    fi

    if ! command_exists git; then
        missing_deps+=("git")
    fi

    if [ ${#missing_deps[@]} -gt 0 ]; then
        print_error "Missing required dependencies: ${missing_deps[*]}"
        print_error "Please install the missing dependencies and run this script again."
        exit 1
    fi

    # Check Python version
    PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    if python3 -c 'import sys; exit(0 if sys.version_info >= (3, 9) else 1)'; then
        print_success "Python $PYTHON_VERSION is compatible"
    else
        print_error "Python 3.9+ is required, but $PYTHON_VERSION is installed"
        exit 1
    fi

    # Check Node.js version
    NODE_VERSION=$(node --version)
    if node -p 'process.version' | grep -E '^v1[6-9]\.|^v[2-9][0-9]' >/dev/null; then
        print_success "Node.js $NODE_VERSION is compatible"
    else
        print_error "Node.js 16+ is required, but $NODE_VERSION is installed"
        exit 1
    fi

    print_success "All system requirements met!"
}

# Function to setup environment file
setup_environment() {
    print_status "Setting up environment configuration..."

    if [ ! -f "$ENV_FILE" ]; then
        if [ -f "$ENV_EXAMPLE" ]; then
            cp "$ENV_EXAMPLE" "$ENV_FILE"
            print_success "Created .env file from template"
            print_warning "Please edit .env file with your actual configuration values"
        else
            print_error ".env.example file not found!"
            exit 1
        fi
    else
        print_warning ".env file already exists, skipping creation"
    fi
}

# Function to setup Python virtual environment
setup_python_env() {
    print_status "Setting up Python virtual environment..."

    cd "$BACKEND_DIR"

    if [ ! -d "venv" ]; then
        python3 -m venv venv
        print_success "Created Python virtual environment"
    else
        print_warning "Virtual environment already exists"
    fi

    # Activate virtual environment
    source venv/bin/activate

    # Upgrade pip
    pip install --upgrade pip

    # Install dependencies
    print_status "Installing Python dependencies..."
    pip install -r requirements.txt

    print_success "Python environment setup complete"

    cd "$PROJECT_DIR"
}

# Function to setup Node.js environment
setup_node_env() {
    print_status "Setting up Node.js environment..."

    cd "$FRONTEND_DIR"

    # Install dependencies
    print_status "Installing Node.js dependencies..."
    npm install

    print_success "Node.js environment setup complete"

    cd "$PROJECT_DIR"
}

# Function to setup database
setup_database() {
    print_status "Setting up database..."

    # Check if PostgreSQL is running
    if command_exists psql; then
        print_status "PostgreSQL found, attempting to create database..."

        # Try to create database (this might fail if it already exists)
        createdb editorial_news 2>/dev/null || print_warning "Database might already exist"

        # Run migrations
        cd "$BACKEND_DIR"
        source venv/bin/activate

        if [ -f "alembic.ini" ]; then
            alembic upgrade head
            print_success "Database migrations applied"
        else
            print_warning "Alembic not configured, skipping migrations"
        fi

        cd "$PROJECT_DIR"
    else
        print_warning "PostgreSQL not found. Please install PostgreSQL or use Docker setup"
    fi
}

# Function to setup Docker environment
setup_docker() {
    if command_exists docker && command_exists docker-compose; then
        print_status "Setting up Docker environment..."

        # Build and start services
        docker-compose build
        docker-compose up -d postgres redis

        # Wait for services to be ready
        print_status "Waiting for services to be ready..."
        sleep 10

        # Run database migrations
        docker-compose exec -T backend alembic upgrade head 2>/dev/null || print_warning "Migration failed or not configured"

        print_success "Docker environment setup complete"
    else
        print_warning "Docker not available, skipping Docker setup"
    fi
}

# Function to create initial data
create_initial_data() {
    print_status "Creating initial data..."

    cd "$BACKEND_DIR"

    # Check if virtual environment exists and activate it
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi

    # Create initial sources from configuration
    python3 -c "
import sys
sys.path.append('.')
try:
    from app.core.config import settings
    from app.core.database import SessionLocal
    from app.models.source import Source

    db = SessionLocal()

    # Create sources from configuration
    for lang, sources in settings.NEWS_SOURCES_CONFIG.items():
        for source_key, source_config in sources.items():
            existing = db.query(Source).filter(Source.name == source_config['name']).first()
            if not existing:
                source = Source.create_from_config(source_config)
                db.add(source)
                print(f'Created source: {source.name}')

    db.commit()
    db.close()
    print('Initial data creation complete')

except Exception as e:
    print(f'Error creating initial data: {e}')
" 2>/dev/null || print_warning "Could not create initial data automatically"

    cd "$PROJECT_DIR"
}

# Function to run tests
run_tests() {
    print_status "Running tests..."

    # Backend tests
    cd "$BACKEND_DIR"
    if [ -d "venv" ]; then
        source venv/bin/activate
        if [ -d "tests" ]; then
            python -m pytest tests/ -v || print_warning "Some backend tests failed"
        else
            print_warning "No backend tests found"
        fi
    fi

    # Frontend tests
    cd "$FRONTEND_DIR"
    if [ -f "package.json" ] && [ -d "node_modules" ]; then
        npm test -- --watchAll=false || print_warning "Some frontend tests failed"
    else
        print_warning "No frontend tests configured"
    fi

    cd "$PROJECT_DIR"
}

# Function to display usage information
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -f, --full          Full setup (default)"
    echo "  -d, --docker        Docker setup only"
    echo "  -l, --local         Local setup only (no Docker)"
    echo "  -t, --test          Run tests only"
    echo "  --skip-tests        Skip running tests"
    echo "  --skip-data         Skip creating initial data"
    echo ""
    echo "Examples:"
    echo "  $0                  # Full setup"
    echo "  $0 --docker         # Docker setup only"
    echo "  $0 --local          # Local development setup"
    echo "  $0 --test           # Run tests only"
}

# Function to display post-setup instructions
show_instructions() {
    print_success "Setup completed successfully!"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo ""
    echo "1. Edit the .env file with your configuration:"
    echo "   - Add your API keys (OpenAI, Google Translate, etc.)"
    echo "   - Configure your database connection"
    echo "   - Set your secret key"
    echo ""
    echo "2. Start the application:"
    echo ""
    echo "   ${YELLOW}For Docker setup:${NC}"
    echo "   docker-compose up"
    echo ""
    echo "   ${YELLOW}For local development:${NC}"
    echo "   # Terminal 1 - Backend"
    echo "   cd backend && source venv/bin/activate"
    echo "   uvicorn app.main:app --reload"
    echo ""
    echo "   # Terminal 2 - Frontend"
    echo "   cd frontend && npm start"
    echo ""
    echo "   # Terminal 3 - Celery Worker (optional)"
    echo "   cd backend && source venv/bin/activate"
    echo "   celery -A app.tasks.celery_app worker --loglevel=info"
    echo ""
    echo "3. Access the application:"
    echo "   - Frontend: http://localhost:3000"
    echo "   - Backend API: http://localhost:8000"
    echo "   - API Documentation: http://localhost:8000/docs"
    echo ""
    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

# Main setup function
main() {
    local setup_type="full"
    local skip_tests=false
    local skip_data=false

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -f|--full)
                setup_type="full"
                shift
                ;;
            -d|--docker)
                setup_type="docker"
                shift
                ;;
            -l|--local)
                setup_type="local"
                shift
                ;;
            -t|--test)
                setup_type="test"
                shift
                ;;
            --skip-tests)
                skip_tests=true
                shift
                ;;
            --skip-data)
                skip_data=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    echo -e "${BLUE}"
    echo "============================================"
    echo "  Editorial News Aggregator Setup Script  "
    echo "============================================"
    echo -e "${NC}"
    echo ""

    # Run setup based on type
    case $setup_type in
        "full")
            check_requirements
            setup_environment
            setup_python_env
            setup_node_env
            setup_database
            setup_docker
            if [ "$skip_data" = false ]; then
                create_initial_data
            fi
            if [ "$skip_tests" = false ]; then
                run_tests
            fi
            show_instructions
            ;;
        "docker")
            check_requirements
            setup_environment
            setup_docker
            if [ "$skip_data" = false ]; then
                create_initial_data
            fi
            if [ "$skip_tests" = false ]; then
                run_tests
            fi
            show_instructions
            ;;
        "local")
            check_requirements
            setup_environment
            setup_python_env
            setup_node_env
            setup_database
            if [ "$skip_data" = false ]; then
                create_initial_data
            fi
            if [ "$skip_tests" = false ]; then
                run_tests
            fi
            show_instructions
            ;;
        "test")
            run_tests
            ;;
    esac
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
