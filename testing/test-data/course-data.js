module.exports = {
  // Login credentials specifically for course management tests
  loginCredentials: {
    admin: {
      email: "course-admin@example.com",
      password: "CourseAdmin123!",
      role: "admin"
    },
    jobseeker: {
      email: "course-jobseeker@example.com", 
      password: "CourseJobseeker123!",
      role: "jobseeker"
    },
    employer: {
      email: "course-employer@example.com",
      password: "CourseEmployer123!",
      role: "employer"
    }
  },

  // Course test data
  kitchenCourse: {
    title: "Kitchen Basics Training",
    category: "kitchen",
    role: "beginner",
    description: "Fundamental kitchen safety and procedures"
  },
  
  deliveryCourse: {
    title: "Delivery Route Optimization", 
    category: "delivery",
    role: "intermediate",
    description: "Advanced delivery route planning techniques"
  },
  
  accountingCourse: {
    title: "Accounting Fundamentals",
    category: "accounting",
    role: "advanced", 
    description: "Basic accounting principles and practices"
  },
  
  archivedCourse: {
    title: "Archived Safety Course",
    category: "kitchen",
    role: "beginner",
    description: "This course has been archived"
  },
  
  invalidCourse: {
    title: "",
    category: "",
    role: "beginner"
  },
  
  specialCharsCourse: {
    title: "Special Chars Course <>" + Date.now(),
    category: "kitchen",
    role: "beginner",
    description: "Course with <script>alert('test')</script> & special © characters"
  },
  
  bulkCourses: [
    {
      title: "Bulk Kitchen Course 1 " + Date.now(),
      category: "kitchen",
      role: "beginner"
    },
    {
      title: "Bulk Accounting Course 2 " + Date.now(),
      category: "accounting",
      role: "beginner"
    },
    {
      title: "Bulk Delivery Course 3 " + Date.now(),
      category: "delivery",
      role: "intermediate"
    }
  ],

  // Asset test data
  assets: {
    textAsset: {
      title: "Course Notes",
      content: "This is the course content text for testing"
    },
    fileAsset: {
      title: "Training Manual",
      filePath: "test-assets/test-profile-pic.jpg"
    }
  }
};