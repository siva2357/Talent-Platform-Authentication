const mongoose = require("mongoose");
require("dotenv").config({ path: __dirname + "/../.env" });
const MasterData = require("../models/masterData");

const isLocal = process.env.NODE_ENV !== "production" && !!process.env.MONGO_LOCAL_URI;
const MONGO_URI = isLocal ? process.env.MONGO_LOCAL_URI : process.env.MONGO_URI;

const seedData = [
  {
    category: "Languages",
    options: [
      { key: "en", value: "English" },
      { key: "hi", value: "Hindi" },
      { key: "es", value: "Spanish" },
      { key: "fr", value: "French" },
      { key: "de", value: "German" },
      { key: "zh", value: "Mandarin" },
      { key: "te", value: "Telugu" }
    ]
  },
  {
    category: "Skills",
    options: [
      { key: "angular", value: "Angular" },
      { key: "react", value: "React" },
      { key: "node", value: "Node.js" },
      { key: "python", value: "Python" },
      { key: "java", value: "Java" },
      { key: "ui_ux", value: "UI/UX Design" }
    ]
  },
  {
    category: "ExperienceLevel",
    options: [
      { key: "entry", value: "Entry" },
      { key: "intermediate", value: "Intermediate" },
      { key: "expert", value: "Expert" }
    ]
  },
  {
    category: "Availability",
    options: [
      { key: "full_time", value: "Full-time" },
      { key: "part_time", value: "Part-time" },
      { key: "hourly", value: "Hourly" }
    ]
  },
  {
    category: "ContractTypes",
    options: [
      { key: "part_time", value: "Part time" },
      { key: "full_time", value: "Full time" }
    ]
  },
  {
    category: "ContractCategories",
    options: [
      { key: "web_dev", value: "Web Development" },
      { key: "mobile_dev", value: "Mobile Development" },
      { key: "design", value: "Design" },
      { key: "writing", value: "Writing" },
      { key: "marketing", value: "Marketing" },
      { key: "data_science", value: "Data Science" }
    ]
  },
  {
    category: "ContractSubjects",
    options: [
      { key: "frontend", value: "Frontend" },
      { key: "backend", value: "Backend" },
      { key: "fullstack", value: "Full Stack" },
      { key: "ui_ux", value: "UI/UX" },
      { key: "devops", value: "DevOps" }
    ]
  },
  {
    category: "ProjectTypes",
    options: [
      { key: "personal", value: "Personal Project" },
      { key: "client", value: "Client Work" },
      { key: "open_source", value: "Open Source" },
      { key: "academic", value: "Academic" }
    ]
  },
  {
    category: "BlogCategories",
    options: [
      { key: "tech", value: "Technology" },
      { key: "design", value: "Design" },
      { key: "career", value: "Career Advice" },
      { key: "news", value: "Platform News" },
      { key: "freelancing", value: "Freelancing Tips" }
    ]
  },
  {
    category: "SocialMediaPlatforms",
    options: [
      { key: "linkedin", value: "LinkedIn" },
      { key: "github", value: "GitHub" },
      { key: "twitter", value: "Twitter/X" },
      { key: "dribbble", value: "Dribbble" },
      { key: "behance", value: "Behance" },
      { key: "portfolio", value: "Personal Portfolio" }
    ]
  },
  {
    category: "ContractStatus",
    options: [
      { key: "draft", value: "Draft" },
      { key: "open", value: "Open" },
      { key: "in progress", value: "In Progress" },
      { key: "completed", value: "Completed" },
      { key: "closed", value: "Closed" }
    ]
  },
  {
    category: "ApplicationStatus",
    options: [
      { key: "pending", value: "Pending" },
      { key: "passed", value: "Passed" },
      { key: "failed", value: "Failed" },
      { key: "none", value: "None" },
      { key: "sent", value: "Sent" },
      { key: "accepted", value: "Accepted" },
      { key: "declined", value: "Declined" }
    ]
  },
  {
    category: "OfferStatus",
    options: [
      { key: "sent", value: "Sent" },
      { key: "accepted", value: "Accepted" },
      { key: "declined", value: "Declined" },
      { key: "revoked", value: "Revoked" }
    ]
  },
  {
    category: "Gender",
    options: [
      { key: "Male", value: "Male" },
      { key: "Female", value: "Female" },
      { key: "Other", value: "Other" }
    ]
  },
  {
    category: "ContractPhaseStatus",
    options: [
      { key: "pending", value: "Pending" },
      { key: "in-progress", value: "In Progress" },
      { key: "submitted", value: "Submitted" },
      { key: "changes-requested", value: "Changes Requested" },
      { key: "approved", value: "Approved" },
      { key: "overdue", value: "Overdue" }
    ]
  },
  {
    category: "ContractDiaryStatus",
    options: [
      { key: "not-started", value: "Not Started" },
      { key: "in-progress", value: "In Progress" },
      { key: "completed", value: "Completed" },
      { key: "cancelled", value: "Cancelled" }
    ]
  },
  {
    category: "SupportTicketStatus",
    options: [
      { key: "Open", value: "Open" },
      { key: "WaitingForAdmin", value: "Waiting for Admin" },
      { key: "WaitingForUser", value: "Waiting for User" },
      { key: "Resolved", value: "Resolved" },
      { key: "Closed", value: "Closed" }
    ]
  },
  {
    category: "SupportTicketCategory",
    options: [
      { key: "technical", value: "Technical Issue" },
      { key: "billing", value: "Billing" },
      { key: "general", value: "General Inquiry" },
      { key: "account", value: "Account Management" },
      { key: "report", value: "Report User/Content" }
    ]
  }
];

const seedMasterData = async () => {
  try {
    if (!MONGO_URI) {
      console.error("MONGO_URI is not defined in .env");
      process.exit(1);
    }
    await mongoose.connect(MONGO_URI, { autoIndex: true });
    console.log("Connected to MongoDB");

    // Clear existing to avoid duplicates during dev seeding
    await MasterData.deleteMany({});
    console.log("Cleared existing master data");

    await MasterData.insertMany(seedData);
    console.log("Master Data Seeded Successfully");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding master data:", error);
    process.exit(1);
  }
};

seedMasterData();
