import Company from "../models/Company_model.js";
import User from "../models/User_model.js";

const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const registerCompanyOwner = async (req, res, next) => {
  try {
    const { companyName, businessLicense, phone, city, address } = req.body;
    const userId = req.user.id; // Extracted from auth middleware

    // Check if user already owns a company
    const existingCompany = await Company.findOne({ ownerId: userId });
    if (existingCompany) {
      return res
        .status(400)
        .json({
          status: "fail",
          message: "User already owns a company account",
        });
    }

    // Derive tenant identifiers from the official company name
    const slug = slugify(companyName || "");
    const subdomain = slug.slice(0, 30);

    // 1. Create company in pending status (model defaults to PENDING)
    const newCompany = await Company.create({
      name: companyName,
      ownerId: userId,
      subdomain,
      slug,
      email: req.user.email,
      phone,
      city,
      address: address || city,
      commercialRegisterNumber: businessLicense,
      status: "PENDING",
    });

    // 2. Elevate user role to company owner
    await User.findByIdAndUpdate(userId, {
      role: "company",
      company: newCompany._id,
    });

    res.status(201).json({
      status: "success",
      message:
        "Company registration submitted successfully. Awaiting admin verification.",
      data: { company: newCompany },
    });
  } catch (error) {
    next(error);
  }
};
