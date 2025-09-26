# Trial Shift

## Overview

This project is a web application built using Node.js, Vanilla JavaScript, HTML & CSS (Materialize), and MongoDB. It follows the MVC (Model-View-Controller) architecture, ensuring a clear separation of concerns.

## Project Structure

```
Trial_Shift
├── src
│   ├── app.js
│   ├── controllers
│   │   ├── adminController.js
│   │   ├── adminUserController.js
│   │   ├── courseController.js
│   │   ├── jobController.js
│   │   ├── jobMatchController.js
│   │   ├── jobPrefereceController.js
│   │   └── userController.js
│   ├── middleware
│   │   └── authMiddleware.js
│   ├── models
│   │   ├── category.js
│   │   ├── job.js
│   │   ├── jobPreference.js
│   │   ├── module.js
│   │   ├── profileUpdateRequest.js
│   │   └── user.js
│   ├── public
│   │   ├── css
│   │   │   ├── admin-approval.css
│   │   │   ├── admin-user.css
│   │   │   ├── courses.css
│   │   │   ├── job-post.css
│   │   │   ├── job-preferences.css
│   │   │   ├── profile.css
│   │   │   └── styles.css
│   │   ├── img
│   │   │   ├── learning.png
│   │   │   └── logo.png
│   │   ├── js
│   │   │   ├── courses.js
│   │   │   └── job-preferences.js
│   │   └── dashboard.html
│   ├── routes
│   │   ├── adminUserRoutes.js
│   │   ├── courseRoutes.js
│   │   ├── jobMatchRoutes.js
│   │   ├── jobPreferenceRoutes.js
│   │   ├── jobRoutes.js
│   │   └── userRoutes.js
│   └── views
│       ├── components
│       │   └── sidebar.js
│       ├── courses.html
│       ├── job-Matches.html
│       ├── job-Preferences.html
│       ├── job-apply.html
│       ├── job-edit.html
│       ├── job-post.html
│       ├── login.html
│       ├── profile.html
│       ├── review-request.html
│       └── user.html
├── package.json
├── .env
└── README.md
```

## Stack

- **Node.js / Express**
- **MongoDB / Mongoose**
- **Materialize CSS**
- **Vanilla JavaScript**

## Setup Instructions

1. **Clone the Repository**

   ```bash
   git clone https://github.com/S224734529/SIT725_Trial_Shift.git
   ```

2. **Install Dependencies**
   Make sure you have Node.js installed. Then run:

   ```bash
   npm install

   npm install express mongoose dotenv jsonwebtoken bcrypt

   npm install googleapis multer
   ```

3. **Environment Variables**
   Create a `.env` file in the root directory and add your MongoDB connection string and any other necessary environment variables.

4. **Run the Application**
   Start the server with:
   ```bash
   node src/app.js
   ```
   The application will be running on `http://localhost:5000`.

## Usage

- Navigate to the main page at `http://localhost:5000` to access the application.
Navigate to http://localhost:3000 for the login page.
Use http://localhost:3000/job-post to create, update, or delete job postings.
Use http://localhost:3000/category-counts to view job counts by category.
Use http://localhost:3000/job-apply to apply for available jobs.
- Use the user-related functionalities available on the user page.

## Job Preferences API

- `GET /api/job-preferences` → list current user’s preferences
- `POST /api/job-preferences` → create one
  - body: { preferredLocation, preferredCategories[], programmingLanguages[] }
- `PUT /api/job-preferences/:id` → update one
- `DELETE /api/job-preferences/:id` → delete one
- `DELETE /api/job-preferences` → bulk delete

  - body: { ids: ["...", "..."] }

- Job Management

POST /api/jobs → Create a new job
Body: { title, category, location, shiftDetails }

PUT /api/jobs/:id → Update a job
Body: { title, category, location, shiftDetails }

DELETE /api/jobs/:id → Delete a job
DELETE /api/jobs/bulk → Bulk delete jobs
Body: { jobIds: ["...", "..."] }

GET /api/jobs → List available jobs
POST /api/jobs/apply → Apply for a job
Body: { jobId, applicantName, coverLetter }

- Category Management
GET /api/categories/counts → Get job counts by category

  # Job Preferences App (Node.js + Express + MongoDB)

## Cousrse Content Management API

- `GET /api/modules` → list all modules
  - Query params:
    - category (optional)
    - search (optional, searches title)
    - visibility (optional)
- `GET /api/modules/:id` → get a specific module
- `POST /api/modules` → create a new module
  - body: { title, category } (both required)
- `PUT /api/modules/:id` → update a module
- `DELETE /api/modules/:id` → delete a module
- `DELETE /api/modules` → bulk delete
  - body: { ids: ["...", "..."] }
- `POST /api/modules/:id/assets` → upload assets to a module
  - body:
    - type: string
    - title: string
    - text: string (if type is 'text')
    - url: string (for non-text assets)
- `POST /api/modules/:id/release` → publish a new version of a module

A simple CRUD app for **Job Preferences** with:

- Create / Read / Update / Delete
- **Bulk delete** with “Select All”
- Fields: `preferredLocation`, `preferredCategories[]`
- UI: **Materialize CSS** ( HTML + vanilla JS)

## Contributing

Feel free to contribute to this project by submitting issues or pull requests. Make sure to follow the coding standards and project structure.

## License

This project is licensed under the MIT License.
