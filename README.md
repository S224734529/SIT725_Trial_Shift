# Trial Shift - Job Management Platform

## Overview
Trial Shift is a comprehensive job management web application built using Node.js, Express, MongoDB, and Vanilla JavaScript. The platform enables employers to post jobs, manage categories, and allows job seekers to apply for positions. The application follows MVC architecture with robust API endpoints and modern UI design.

## Project Structure

src/
├── config/
│   └── cloudinary.js
├── controllers/
│   ├── adminController.js
│   ├── adminUserController.js
│   ├── courseController.js
│   ├── jobController.js
│   ├── jobController.test.js
│   ├── jobMatchController.js
│   ├── jobPreferenceController.js
│   └── userController.js
├── middleware/
│   └── authMiddleware.js
├── models/
│   ├── category.js
│   ├── job.js
│   ├── jobPreference.js
│   ├── module.js
│   ├── profileUpdateRequest.js
│   └── user.js
├── public/
│   ├── css/
│   │   ├── admin-approval.css
│   │   ├── admin-user.css
│   │   ├── category-manage.css
│   │   ├── courses.css
│   │   ├── job-post.css
│   │   ├── job-preferences.css
│   │   ├── profile.css
│   │   └── styles.css
│   ├── img/
│   └── js/
│       ├── courses.js
│       └── job-preferences.js
├── routes/
│   ├── adminRoutes.js
│   ├── adminUserRoutes.js
│   ├── courseRoutes.js
│   ├── jobMatchRoutes.js
│   ├── jobPreferenceRoutes.js
│   ├── jobRoutes.js
│   └── userRoutes.js
├── views/
│   ├── components/
│   ├── category-edit.html
│   ├── category-manage.html
│   ├── courses.html
│   ├── employer-dashboard.html
│   ├── job-Matches.html
│   ├── job-Preferences.html
│   ├── job-edit.html
│   ├── job-post.html
│   ├── job-seeker-dashboard.html
│   ├── login.html
│   ├── profile.html
│   ├── review-request.html
│   └── user.html
└── app.js

test-assets/

testing/
├── api/
│   ├── factories/
│   └── specs/
│       ├── admin.approve.spec.js
│       ├── admin.decline.spec.js
│       ├── admin.spec.js
│       ├── auth.spec.js
│       ├── categoryCrud.spec.js
│       ├── courseAPI.spec.js
│       ├── job-preferences.api.test.js
│       ├── jobCrud.spec.js
│       ├── profile.spec.js
│       ├── users.bulk.delete.spec.js
│       ├── users.delete.spec.js
│       ├── users.inactive.spec.js
│       └── users.spec.js
├── config/
│   ├── .env.test
│   ├── jest.config.js
│   └── playwright.config.js
├── e2e/
│   ├── pages/
│   │   ├── category.page.js
│   │   ├── courses.page.js
│   │   ├── job-preferences.page.js
│   │   ├── job.page.js
│   │   ├── login.page.js
│   │   ├── profile.page.js
│   │   ├── register.page.js
│   │   ├── review-request.page.js
│   │   └── user.page.js
│   └── specs/
│       ├── categoryCrud.spec.js
│       ├── courses.spec.js
│       ├── job-preferences.spec.js
│       ├── jobCrud.spec.js
│       ├── login.spec.js
│       ├── profile.spec.js
│       ├── register.spec.js
│       ├── review-request.spec.js
│       └── user.spec.js
└── test-data/
    └── course-data.js

.env
.gitignore
LICENSE
README.md
package-lock.json
package.json
seedContent.js
seedCourseUsers.js


```
## Technology Stack
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Frontend**: Vanilla JavaScript, HTML5, Materialize CSS
- **Authentication**: JWT (JSON Web Tokens)
- **Testing**: Mocha, Chai, Supertest, Playwright

## Database Schema

Job Model

javascript
{
  title: String,
  category: { type: ObjectId, ref: 'Category' },
  location: String,
  shiftDetails: String,
  employerId: String, // Reference to User
  applications: [{
    applicantName: String,
    coverLetter: String,
    appliedAt: Date
  }],
  expiryDate: Date,
  createdAt: Date
}

Category Model

javascript
{
  name: String,
  description: String,
  jobCount: Number
}
JobPreference Model
javascript
{
  userId: { type: ObjectId, ref: 'User' },
  preferredLocation: String,
  preferredCategories: [String],
  programmingLanguages: [String],
  experienceLevel: String
}
Job & Category APIs
Job Management API
Create Job
POST /api/jobs

javascript
// Request Body
{
  "title": "Senior Kitchen Hand",
  "category": "kitchenhand",
  "location": "Melbourne",
  "shiftDetails": "Evening shifts, 5pm-11pm"
}

// Response
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "Senior Kitchen Hand",
  "category": { "name": "kitchenhand" },
  "location": "Melbourne",
  "shiftDetails": "Evening shifts, 5pm-11pm",
  "employerId": "12345"
}
Get All Jobs
GET /api/jobs

Returns all jobs with populated category information
Supports employer-specific job filtering
Update Job
PUT /api/jobs/:id

javascript
// Request Body
{
  "title": "Updated Job Title",
  "category": "cleaning",
  "location": "Sydney",
  "shiftDetails": "Updated shift details"
}

Delete Job
DELETE /api/jobs/:id
Deletes a specific job by ID
Employer-specific authorization
Bulk Delete Jobs
DELETE /api/jobs/bulk

javascript
// Request Body
{
  "jobIds": ["id1", "id2", "id3"]
}

Category Management API
Get All Categories
GET /api/categories
Returns all categories with job counts

Create Category
POST /api/categories

javascript
// Request Body
{
  "name": "Software Development",
  "description": "IT and programming roles"
}

Update Category
PUT /api/categories/:id
Updates category name and description

Delete Category
DELETE /api/categories/:id
Removes category if no jobs are associated

Get Category Counts
GET /api/categories/counts
Returns job counts per category
Job Application API
Apply for Job
POST /api/jobs/apply

javascript
// Request Body
{
  "jobId": "507f1f77bcf86cd799439011",
  "applicantName": "John Doe",
  "coverLetter": "I am interested in this position..."
}

## Workflows

# Job Posting Workflow

Employer Authentication → Login with employer role
Job Creation → Fill job form with title, category, location, shift details
Category Management → Auto-create categories if they don't exist
Job Listing → Jobs displayed in employer dashboard
Job Applications → Job seekers apply through the system

# Category Management Workflow

Admin/Employer Access → Role-based access to category management
Category Creation → Create new job categories with descriptions
Category Assignment → Jobs are linked to categories
Category Analytics → Track job counts per category



## Testing Structure

API Testing
Located in testing/api/specs/
Authentication Tests: Login, registration, token validation
Job Tests: CRUD operations, category management

End-to-End Testing
Located in testing/e2e/specs/
Login/Registration: User flow testing
Profile Management: Update and view profiles
Job Operations: Posting, editing, deleting jobs

Running Tests
bash
# API Tests
npm run test:api

# E2E Tests  
npm run test:e2e

# All Tests
npm test
Setup Instructions
Prerequisites
Node.js (v14 or higher)

MongoDB (local or Atlas)

Git

Installation
Clone Repository

bash
git clone https://github.com/S224734529/SIT725_Trial_Shift.git
cd SIT725_Trial_Shift
Install Dependencies

bash
npm install
Environment Setup
Create .env file:

env
MONGODB_URI=mongodb://localhost:27017/trialshift
JWT_SECRET=your_jwt_secret_key
PORT=5000
Start Application

bash
node src/app.js
Application runs on http://localhost:5000

Usage Guide
For Employers
Register/Login with employer role
Access job posting dashboard
Create and manage job listings
Review applications

For Job Seekers
Register/Login with jobseeker role
Set job preferences
Browse and apply for jobs
View job matches

##  API Authentication
All protected routes require JWT token in Authorization header:

text
Authorization: Bearer <jwt_token>
## Contributing

## Fork the repository

Create feature branch (git checkout -b feature/AmazingFeature)

Commit changes (git commit -m 'Add AmazingFeature')

Push to branch (git push origin feature/AmazingFeature)

Open Pull Request

## License
This project is licensed under the MIT License - see the LICENSE file for details.

