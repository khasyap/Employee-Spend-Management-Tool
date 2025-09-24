const mongoose = require("mongoose");
const User = require("../models/user.model");
const Category = require("../models/category.model");
const Settings = require("../models/settings.model");
const Claim = require("../models/claim.model");
const CabDriver = require("../models/cabdriver.model");

const MONGO_URI = "mongodb://localhost:27017/expenses-manager";

const seedData = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    await User.deleteMany();
    await Category.deleteMany();
    await Settings.deleteMany();
    await Claim.deleteMany();
    await CabDriver.deleteMany();

    // --- Admin user ---
    const admin = new User({
      name: "System Administrator",
      email: "admin@expense.com",
      password: "admin123",
      role: "admin",
    });
    await admin.save();

    // --- Finance users ---
    const financeUsers = [];
    for (let i = 1; i <= 3; i++) {
      const finance = new User({
        name: `Finance Manager ${i}`,
        email: `finance${i}@expense.com`,
        password: "finance123",
        role: "finance",
      });
      await finance.save();
      financeUsers.push(finance);
    }

    // --- Managers ---
    const managerUsers = [];
    let financeIndex = 0;
    for (let i = 1; i <= 10; i++) {
      const manager = new User({
        name: `Department Manager ${i}`,
        email: `manager${i}@expense.com`,
        password: "manager123",
        role: "manager",
        financeId: financeUsers[financeIndex]._id,
      });
      await manager.save();
      managerUsers.push(manager);
      financeIndex = (financeIndex + 1) % financeUsers.length;
    }

    // --- Employees ---
    let managerIndex = 0;
    for (let i = 1; i <= 200; i++) {
      const manager = managerUsers[managerIndex];
      const finance = financeUsers.find((f) =>
        f._id.equals(manager.financeId)
      );

      const employee = new User({
        name: `Employee ${i}`,
        email: `employee${i}@expense.com`,
        password: "employee123",
        role: "employee",
        managerId: manager._id,
        financeId: finance._id,
        paymentDetails: {
          upiId: `employee${i}@upi`,
          bankAccount: {
            accountNumber: `100000000${i}`,
            bankName: "State Bank of India",
            ifscCode: "SBIN0001234",
            accountHolderName: `Employee ${i}`,
          },
        },
      });

      await employee.save();
      managerIndex = (managerIndex + 1) % managerUsers.length;
    }

    // --- Categories ---
    const categories = [
      { name: "Travel", code: "TRV", isActive: true },
      { name: "Food", code: "FOD", isActive: true },
      { name: "Transport", code: "TRN", isActive: true },
      { name: "Stationery", code: "STN", isActive: true },
      { name: "Equipment", code: "EQP", isActive: true },
      { name: "Software", code: "SFT", isActive: true },
      { name: "Training", code: "TRG", isActive: true },
      { name: "Entertainment", code: "ENT", isActive: true },
      { name: "Office Supplies", code: "OFS", isActive: true },
      { name: "Miscellaneous", code: "MSC", isActive: true },
    ];

    for (const categoryData of categories) {
      const category = new Category(categoryData);
      await category.save();
    }

    // --- Cab Drivers ---
    const cabDrivers = [
      {
        name: "Ravi Kumar",
        contactNumber: "9876543210",
        alternateContact: "9123456789",
        licenseNumber: "AP29D1234",
        carModel: "Hyundai i20",
        carNumber: "AP29AB1234",
        carColor: "White",
        capacity: 4,
        isAvailable: true,
        availabilitySchedule: [
          { day: "monday", shift: "morning", available: true },
          { day: "tuesday", shift: "afternoon", available: true },
        ],
        currentLocation: "Vijayawada",
        rating: 4.5,
        totalTrips: 250,
      },
      {
        name: "Suresh Reddy",
        contactNumber: "9988776655",
        licenseNumber: "TS08C5678",
        carModel: "Maruti Swift",
        carNumber: "TS08XY5678",
        carColor: "Red",
        capacity: 4,
        isAvailable: false,
        currentLocation: "Hyderabad",
        rating: 4.0,
        totalTrips: 180,
      },
    ];

    await CabDriver.insertMany(cabDrivers);

    // --- Logs ---
    console.log("✅ Admin login: admin@expense.com / admin123");
    console.log("✅ Categories created:", categories.length);
    console.log("✅ Cab Drivers created:", cabDrivers.length);
    console.log("🎉 Seed data created successfully!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
};

seedData();
