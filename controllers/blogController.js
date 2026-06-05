const Blog = require("../models/blog");

const initialPosts = [
  {
    title: "How AI Intelligence helps users discover opportunities",
    slug: "how-ai-intelligence-helps-users",
    description: "Explore how our advanced AI algorithms analyze skills and market trends to provide the most relevant contract recommendations.",
    category: "Artificial Intelligence",
    image: "/assets/images/blog/ai_intelligence_blog.png",
    readTime: "5 min read",
    status: "Published",
    author: {
      name: "Dr. Sarah Chen",
      role: "Head of AI",
      avatar: "assets/images/profiles/avatar-1.jpg"
    },
    content: `
      <p class="lead text-secondary">Artificial Intelligence is no longer just a buzzword; it is the backbone of the modern freelancing economy. At Talent Hub, we have harnessed the power of advanced AI to bridge the gap between world-class talent and high-impact opportunities.</p>
      
      <h2 class="fw-bold mt-5 mb-4 text-white">The Power of Intelligent Recommendations</h2>
      <p class="text-secondary">Our AI doesn't just look for keywords. It understands context, intent, and soft skills. By analyzing thousands of successful project completions, the algorithm identifies patterns that lead to long-term success. For a freelancer, this means receiving recommendations that aren't just "relevant" but are truly aligned with their career trajectory.</p>
      
      <div class="my-5 p-5 glass rounded-5 border-start border-brand border-5">
        <h4 class="fw-bold mb-3 text-white">Key AI Features in Talent Hub:</h4>
        <ul class="text-secondary d-grid gap-3" style="list-style: none; padding-left: 0;">
          <li><i class="bi bi-check2 text-brand me-2"></i> Semantic skill analysis beyond basic keywords</li>
          <li><i class="bi bi-check2 text-brand me-2"></i> Predictive project success scoring</li>
          <li><i class="bi bi-check2 text-brand me-2"></i> Real-time market trend integration</li>
          <li><i class="bi bi-check2 text-brand me-2"></i> Personalized career growth suggestions</li>
        </ul>
      </div>

      <h2 class="fw-bold mt-5 mb-4 text-white">Continuous Learning and Adaptation</h2>
      <p class="text-secondary">One of the most powerful aspects of our intelligence system is its ability to learn. Every interaction, every feedback loop, and every successfully delivered milestone helps the system refine its understanding of what makes a perfect match. This constant evolution ensures that the platform remains at the cutting edge of the industry.</p>
    `
  },
  {
    title: "Our Service: A Comprehensive Guide to Talent Hub",
    slug: "our-service-comprehensive-guide",
    description: "Discover the full suite of tools and services designed to empower freelancers and businesses in the modern remote work era.",
    category: "Services",
    image: "/assets/images/blog/talent_hub_services_blog.png",
    readTime: "8 min read",
    status: "Published",
    author: {
      name: "Michael Ross",
      role: "Product Lead",
      avatar: "assets/images/profiles/avatar-2.jpg"
    },
    content: `
      <p class="lead text-secondary">Talent Hub is more than a marketplace; it's a comprehensive ecosystem designed to manage the entire lifecycle of remote work. From the first handshake to the final payment, our services are built with transparency and efficiency at their core.</p>
      
      <h2 class="fw-bold mt-5 mb-4 text-white">A Centralized Workspace for Modern Teams</h2>
      <p class="text-secondary">Managing multiple freelancers and projects can be chaotic. Our centralized workspace simplifies this by bringing chat, file sharing, meeting scheduling, and task tracking into one unified interface. This reduces friction and allows teams to focus on what matters most: delivering high-quality results.</p>

      <h2 class="fw-bold mt-5 mb-4 text-white">Integrated Financial Services</h2>
      <p class="text-secondary">Trust is built on reliable financial interactions. Our integrated payment system supports multiple currencies, provides detailed invoicing, and ensures that funds are held securely until milestones are met. This protects both the talent and the client, creating a safe environment for global collaboration.</p>
    `
  },
  {
    title: "How We Work: Building a Seamless Freelancing Ecosystem",
    slug: "how-we-work-seamless-ecosystem",
    description: "A deep dive into our operational philosophy and how we ensure a smooth collaboration between talent and clients.",
    category: "Workflow",
    image: "/assets/images/blog/how_we_work_blog.png",
    readTime: "6 min read",
    status: "Published",
    author: {
      name: "Jane Doe",
      role: "Operations Director",
      avatar: "assets/images/profiles/avatar-3.jpg"
    },
    content: `
      <p class="lead text-secondary">Operational workflows are key to delivering projects on schedule. In this guide, we discuss how Talent Hub bridges communication and tasks between developers and clients.</p>
      <h2 class="fw-bold mt-5 mb-4 text-white">Milestone Tracking</h2>
      <p class="text-secondary">Projects are split into milestones, ensuring clear expectations, progressive validation, and safe payouts. Admins monitor milestone dispute resolutions statefully.</p>
    `
  },
  {
    title: "Smart Matching: How Talent Meets Intelligence",
    slug: "smart-matching-talent-meets-intelligence",
    description: "Learn about the technology behind our matching system and how it ensures the perfect fit for every project.",
    category: "Technology",
    image: "/assets/images/blog/talent_match_blog.png",
    readTime: "7 min read",
    status: "Published",
    author: {
      name: "Alex Rivera",
      role: "Lead Architect",
      avatar: "assets/images/profiles/avatar-4.jpg"
    },
    content: `
      <p class="lead text-secondary">Matching talent with contracts goes beyond mere keyword searches. We combine ratings, completed projects, and skill metrics to suggest ideal candidates.</p>
    `
  },
  {
    title: "Secure Payments: Ensuring Trust with Legal Contracts",
    slug: "secure-payments-ensuring-trust",
    description: "Everything you need to know about our milestone-based payment system and how we protect every transaction.",
    category: "Security",
    image: "/assets/images/blog/secure_payments_blog.png",
    readTime: "10 min read",
    status: "Published",
    author: {
      name: "Sarah Connor",
      role: "Security Specialist",
      avatar: "assets/images/profiles/avatar-5.jpg"
    },
    content: `
      <p class="lead text-secondary">Escrow payments keep contract funds secure. Freelancers work with peace of mind knowing the funds are guaranteed, and clients pay only upon approval.</p>
    `
  }
];

const seedBlogsIfEmpty = async () => {
  const count = await Blog.countDocuments();
  if (count === 0) {
    await Blog.insertMany(initialPosts);
    console.log("Seed blogs inserted successfully.");
  }
};

exports.getAllPosts = async (req, res) => {
  try {
    await seedBlogsIfEmpty();
    const posts = await Blog.find().sort({ createdAt: -1 });
    const formatted = posts.map(p => ({
      id: p._id.toString(),
      title: p.title,
      slug: p.slug,
      description: p.description,
      content: p.content,
      category: p.category,
      image: p.image,
      date: p.createdAt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
      readTime: p.readTime,
      status: p.status,
      author: p.author,
      mediaType: p.mediaType,
      mediaUrl: p.mediaUrl
    }));
    return res.status(200).json(formatted);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPublishedPosts = async (req, res) => {
  try {
    await seedBlogsIfEmpty();
    const posts = await Blog.find({ status: "Published" }).sort({ createdAt: -1 });
    const formatted = posts.map(p => ({
      id: p._id.toString(),
      title: p.title,
      slug: p.slug,
      description: p.description,
      content: p.content,
      category: p.category,
      image: p.image,
      date: p.createdAt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
      readTime: p.readTime,
      status: p.status,
      author: p.author,
      mediaType: p.mediaType,
      mediaUrl: p.mediaUrl
    }));
    return res.status(200).json(formatted);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPostBySlug = async (req, res) => {
  try {
    await seedBlogsIfEmpty();
    const post = await Blog.findOne({ slug: req.params.slug });
    if (!post) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }
    const formatted = {
      id: post._id.toString(),
      title: post.title,
      slug: post.slug,
      description: post.description,
      content: post.content,
      category: post.category,
      image: post.image,
      date: post.createdAt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
      readTime: post.readTime,
      status: post.status,
      author: post.author,
      mediaType: post.mediaType,
      mediaUrl: post.mediaUrl
    };
    return res.status(200).json(formatted);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createPost = async (req, res) => {
  try {
    if (req.role !== "Admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { title, description, content, category, readTime, status, mediaType, mediaUrl } = req.body;
    if (!title || !description || !content || !category) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const defaultImage = "/assets/images/blog/ai_intelligence_blog.png";
    const image = mediaType === "image" && mediaUrl ? mediaUrl : defaultImage;

    const newPost = new Blog({
      title,
      slug,
      description,
      content,
      category,
      image,
      readTime: readTime || "5 min read",
      status: status || "Published",
      author: {
        name: "Admin Desk",
        role: "Platform Administrator",
        avatar: "assets/images/profiles/avatar-1.jpg"
      },
      mediaType: mediaType || null,
      mediaUrl: mediaUrl || null
    });

    await newPost.save();

    return res.status(201).json({
      success: true,
      post: {
        id: newPost._id.toString(),
        title: newPost.title,
        slug: newPost.slug,
        description: newPost.description,
        content: newPost.content,
        category: newPost.category,
        image: newPost.image,
        date: newPost.createdAt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
        readTime: newPost.readTime,
        status: newPost.status,
        author: newPost.author,
        mediaType: newPost.mediaType,
        mediaUrl: newPost.mediaUrl
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.togglePostStatus = async (req, res) => {
  try {
    if (req.role !== "Admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const post = await Blog.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }

    post.status = post.status === "Published" ? "Draft" : "Published";
    await post.save();

    return res.status(200).json({ success: true, message: `Status updated to ${post.status}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    if (req.role !== "Admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const deleted = await Blog.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }

    return res.status(200).json({ success: true, message: "Blog post deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePost = async (req, res) => {
  try {
    if (req.role !== "Admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { title, description, content, category, readTime, status, mediaType, mediaUrl } = req.body;

    const post = await Blog.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }

    if (title) {
      post.title = title;
      post.slug = title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    if (description) post.description = description;
    if (content) post.content = content;
    if (category) post.category = category;
    if (readTime) post.readTime = readTime;
    if (status) post.status = status;
    
    if (mediaType !== undefined) post.mediaType = mediaType;
    if (mediaUrl !== undefined) {
      post.mediaUrl = mediaUrl;
      if (mediaType === "image" && mediaUrl) {
        post.image = mediaUrl;
      }
    }

    await post.save();

    return res.status(200).json({ success: true, post });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
