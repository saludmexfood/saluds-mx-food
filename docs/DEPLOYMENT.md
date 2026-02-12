# DEPLOYMENT

## Local Setup
1. Clone the repository.  
2. Copy `.env.example` to `.env` and fill in placeholder values.  
3. Run `docker-compose up -d` to start services.  
4. Verify services:
   - Backend API: http://localhost:8000/health  
   - Frontend: http://localhost:3000 (placeholder)  
5. To stop services: `docker-compose down`

## Cloud Deployment (Render / Vercel)
1. Push branch to remote repository.  
2. Create a new service on Render or a new project on Vercel.  
3. Connect your repository and select the appropriate branch.  
4. Set environment variables from your `.env` file in the dashboard (using placeholder values).  
5. Configure build commands:
   - Backend: `docker-compose build && docker-compose up -d` (Render Docker)  
   - Frontend: build command (e.g., `npm run build`) and output directory (`build/`).  
6. Deploy and monitor logs for successful startup.