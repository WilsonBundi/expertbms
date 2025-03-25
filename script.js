/**
 * Blood Donor Management System - Frontend Script
 * Works with Node.js backend at http://localhost:3000
 */

// Configuration
const config = {
  apiBaseUrl: "http://localhost:3000/api",
  minSearchChars: 2,
  seriousConditions: [
    "hiv",
    "aids",
    "hepatitis",
    "cancer",
    "heart disease",
    "malaria",
    "ebola",
    "hemophilia",
    "tuberculosis",
  ],
};

// State Management
const state = {
  currentDonorId: null,
  currentAdminId: null,
  isLoading: false,
};

// DOM Elements
const elements = {
  tabs: {
    container: document.querySelector(".tabs"),
    contents: document.querySelectorAll(".tab-content"),
    buttons: document.querySelectorAll(".tab-btn"),
  },
  forms: {
    donorLogin: document.getElementById("donorLoginForm"),
    donorRegister: document.getElementById("donorRegisterForm"),
    adminLogin: document.getElementById("adminLoginForm"),
    updateDonor: document.getElementById("updateDonorForm"),
    adminUpdateDonor: document.getElementById("adminUpdateDonorForm"),
  },
  dashboards: {
    donor: document.getElementById("donor-dashboard"),
    admin: document.getElementById("admin-dashboard"),
  },
};

// Utility Functions
const utils = {
  validateEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),

  validatePhone: (phone) => /^[\d\s\-\(\)]{8,}$/.test(phone),

  hasSeriousCondition: (medicalHistory) => {
    if (!medicalHistory) return false;
    const lowerHistory = medicalHistory.toLowerCase();
    return config.seriousConditions.some((condition) =>
      lowerHistory.includes(condition)
    );
  },

  showLoading: () => {
    state.isLoading = true;
    document.body.classList.add("loading");
  },

  hideLoading: () => {
    state.isLoading = false;
    document.body.classList.remove("loading");
  },

  showError: (message) => {
    alert(`Error: ${message}`);
  },

  formatDate: (dateString) => {
    return new Date(dateString).toLocaleDateString();
  },
};

// API Service
const apiService = {
  async request(endpoint, method = "GET", body = null) {
    const url = `${config.apiBaseUrl}${endpoint}`;
    const options = {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
    };

    if (body) options.body = JSON.stringify(body);

    try {
      utils.showLoading();
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Request failed");
      }

      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      utils.showError(error.message);
      throw error;
    } finally {
      utils.hideLoading();
    }
  },

  // Donor Endpoints
  donorLogin: (email, phone) =>
    apiService.request("/donor-login", "POST", { email, phone }),

  registerDonor: (donorData) =>
    apiService.request("/register-donor", "POST", donorData),

  getDonor: (id) => apiService.request(`/donor/${id}`),

  updateDonor: (id, updateData) =>
    apiService.request("/update-donor", "PUT", { donorId: id, ...updateData }),

  // Admin Endpoints
  adminLogin: (username, password) =>
    apiService.request("/admin-login", "POST", { username, password }),

  getAllDonors: () => apiService.request("/donors"),

  searchDonors: (term) =>
    apiService.request(`/search-donors?term=${encodeURIComponent(term)}`),

  adminUpdateDonor: (donorData) =>
    apiService.request("/admin-update-donor", "PUT", donorData),

  deleteDonor: (id) => apiService.request(`/delete-donor/${id}`, "DELETE"),
};

// UI Functions
const ui = {
  openTab: (tabName) => {
    // Hide all tab contents
    elements.tabs.contents.forEach((tab) => {
      tab.classList.remove("active");
    });

    // Deactivate all tab buttons
    elements.tabs.buttons.forEach((btn) => {
      btn.classList.remove("active");
    });

    // Activate selected tab
    document.getElementById(tabName).classList.add("active");
    event.currentTarget.classList.add("active");
  },

  showDonorDashboard: async (donor, donations) => {
    // Hide all tabs and show donor dashboard
    elements.tabs.contents.forEach((tab) => {
      tab.style.display = "none";
    });
    elements.dashboards.donor.style.display = "block";

    // Display donor profile
    document.getElementById("donor-profile").innerHTML = `
      <p><strong>Name:</strong> ${donor.name}</p>
      <p><strong>Email:</strong> ${donor.email}</p>
      <p><strong>Phone:</strong> ${donor.phone}</p>
      <p><strong>Blood Type:</strong> ${donor.blood_type}</p>
      <p><strong>Medical History:</strong> ${
        donor.medical_history || "None"
      }</p>
    `;

    // Display donation history
    const tbody = document.querySelector("#donation-history-table tbody");
    tbody.innerHTML = "";

    if (donations && donations.length > 0) {
      donations.forEach((donation) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${utils.formatDate(donation.donation_date)}</td>
          <td>${donation.quantity_ml} ml</td>
        `;
        tbody.appendChild(row);
      });
    } else {
      tbody.innerHTML =
        '<tr><td colspan="2">No donation history found</td></tr>';
    }

    // Set values for edit form
    document.getElementById("edit-name").value = donor.name;
    document.getElementById("edit-phone").value = donor.phone;
    document.getElementById("edit-medical-history").value =
      donor.medical_history || "";
  },

  showAdminDashboard: async () => {
    elements.tabs.contents.forEach((tab) => {
      tab.style.display = "none";
    });
    elements.dashboards.admin.style.display = "block";
    await ui.loadAllDonors();
  },

  loadAllDonors: async () => {
    try {
      const data = await apiService.getAllDonors();
      ui.populateDonorsTable(data.donors);
    } catch (error) {
      console.error("Failed to load donors:", error);
    }
  },

  populateDonorsTable: (donors) => {
    const tbody = document.querySelector("#donors-table tbody");
    tbody.innerHTML = "";

    if (donors && donors.length > 0) {
      donors.forEach((donor) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${donor.name}</td>
          <td>${donor.email}</td>
          <td>${donor.phone}</td>
          <td>${donor.blood_type}</td>
          <td>
            <button onclick="ui.showEditDonorForm(${donor.id})">Edit</button>
            <button onclick="ui.deleteDonor(${donor.id})">Delete</button>
          </td>
        `;
        tbody.appendChild(row);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="5">No donors found</td></tr>';
    }
  },

  showEditDonorForm: async (donorId) => {
    try {
      const data = await apiService.getDonor(donorId);
      const donor = data.donor;

      document.getElementById("edit-donor-id").value = donor.id;
      document.getElementById("admin-edit-name").value = donor.name;
      document.getElementById("admin-edit-email").value = donor.email;
      document.getElementById("admin-edit-phone").value = donor.phone;
      document.getElementById("admin-edit-blood-type").value = donor.blood_type;
      document.getElementById("admin-edit-medical-history").value =
        donor.medical_history || "";

      document.getElementById("edit-donor-form").style.display = "block";
    } catch (error) {
      console.error("Failed to load donor:", error);
    }
  },

  deleteDonor: async (donorId) => {
    if (!confirm("Are you sure you want to delete this donor?")) return;

    try {
      await apiService.deleteDonor(donorId);
      alert("Donor deleted successfully!");
      await ui.loadAllDonors();
    } catch (error) {
      console.error("Failed to delete donor:", error);
    }
  },

  logout: () => {
    state.currentDonorId = null;
    state.currentAdminId = null;

    // Reset forms
    elements.forms.donorLogin.reset();
    elements.forms.adminLogin.reset();

    // Hide dashboards
    elements.dashboards.donor.style.display = "none";
    elements.dashboards.admin.style.display = "none";

    // Show login tabs
    ui.openTab("donor-login");
  },
};

// Event Listeners
const setupEventListeners = () => {
  // Tab switching
  elements.tabs.buttons.forEach((button) => {
    button.addEventListener("click", (e) => {
      const tabName = e.currentTarget
        .getAttribute("onclick")
        .match(/'([^']+)'/)[1];
      ui.openTab(tabName);
    });
  });

  // Donor Login
  elements.forms.donorLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("donor-email").value;
    const phone = document.getElementById("donor-phone").value;

    if (!utils.validateEmail(email)) {
      utils.showError("Please enter a valid email address");
      return;
    }

    if (!utils.validatePhone(phone)) {
      utils.showError("Please enter a valid phone number");
      return;
    }

    try {
      const data = await apiService.donorLogin(email, phone);
      state.currentDonorId = data.donor.id;
      await ui.showDonorDashboard(data.donor, data.donations);
    } catch (error) {
      console.error("Login failed:", error);
    }
  });

  // Donor Registration
  elements.forms.donorRegister.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = {
      name: document.getElementById("reg-name").value,
      email: document.getElementById("reg-email").value,
      phone: document.getElementById("reg-phone").value,
      bloodType: document.getElementById("reg-blood-type").value,
      medicalHistory: document.getElementById("reg-medical-history").value,
    };

    // Validate inputs
    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.bloodType
    ) {
      utils.showError("Please fill in all required fields");
      return;
    }

    if (!utils.validateEmail(formData.email)) {
      utils.showError("Please enter a valid email address");
      return;
    }

    if (!utils.validatePhone(formData.phone)) {
      utils.showError("Please enter a valid phone number");
      return;
    }

    if (utils.hasSeriousCondition(formData.medicalHistory)) {
      utils.showError(
        "Serious medical condition detected - please consult with staff"
      );
      return;
    }

    try {
      await apiService.registerDonor(formData);
      alert("Registration successful! Please login.");
      ui.openTab("donor-login");
      elements.forms.donorRegister.reset();
    } catch (error) {
      console.error("Registration failed:", error);
    }
  });

  // Admin Login
  elements.forms.adminLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("admin-username").value;
    const password = document.getElementById("admin-password").value;

    if (!username || !password) {
      utils.showError("Please enter both username and password");
      return;
    }

    try {
      const data = await apiService.adminLogin(username, password);
      state.currentAdminId = data.admin.id;
      await ui.showAdminDashboard();
    } catch (error) {
      console.error("Admin login failed:", error);
    }
  });

  // Update Donor Profile
  elements.forms.updateDonor.addEventListener("submit", async (e) => {
    e.preventDefault();
    const updateData = {
      name: document.getElementById("edit-name").value,
      phone: document.getElementById("edit-phone").value,
      medicalHistory: document.getElementById("edit-medical-history").value,
    };

    if (!updateData.name || !updateData.phone) {
      utils.showError("Please fill in all required fields");
      return;
    }

    if (!utils.validatePhone(updateData.phone)) {
      utils.showError("Please enter a valid phone number");
      return;
    }

    try {
      await apiService.updateDonor(state.currentDonorId, updateData);
      alert("Profile updated successfully!");
      document.getElementById("edit-profile-form").style.display = "none";
      const data = await apiService.getDonor(state.currentDonorId);
      await ui.showDonorDashboard(data.donor, data.donations);
    } catch (error) {
      console.error("Update failed:", error);
    }
  });

  // Admin Update Donor
  elements.forms.adminUpdateDonor.addEventListener("submit", async (e) => {
    e.preventDefault();
    const donorData = {
      donorId: document.getElementById("edit-donor-id").value,
      name: document.getElementById("admin-edit-name").value,
      email: document.getElementById("admin-edit-email").value,
      phone: document.getElementById("admin-edit-phone").value,
      bloodType: document.getElementById("admin-edit-blood-type").value,
      medicalHistory: document.getElementById("admin-edit-medical-history")
        .value,
    };

    if (
      !donorData.name ||
      !donorData.email ||
      !donorData.phone ||
      !donorData.bloodType
    ) {
      utils.showError("Please fill in all required fields");
      return;
    }

    if (!utils.validateEmail(donorData.email)) {
      utils.showError("Please enter a valid email address");
      return;
    }

    if (!utils.validatePhone(donorData.phone)) {
      utils.showError("Please enter a valid phone number");
      return;
    }

    try {
      await apiService.adminUpdateDonor(donorData);
      alert("Donor updated successfully!");
      document.getElementById("edit-donor-form").style.display = "none";
      await ui.loadAllDonors();
    } catch (error) {
      console.error("Update failed:", error);
    }
  });

  // Search Donors
  document
    .getElementById("search-donor")
    .addEventListener("keyup", async (e) => {
      if (e.key === "Enter") {
        const term = e.target.value.trim();
        if (term.length >= config.minSearchChars) {
          try {
            const data = await apiService.searchDonors(term);
            ui.populateDonorsTable(data.donors);
          } catch (error) {
            console.error("Search failed:", error);
          }
        }
      }
    });

  // Button event handlers
  document.querySelector(".logout-btn").addEventListener("click", ui.logout);
  document.getElementById("show-edit-profile").addEventListener("click", () => {
    document.getElementById("edit-profile-form").style.display = "block";
  });
  document
    .getElementById("cancel-edit-profile")
    .addEventListener("click", () => {
      document.getElementById("edit-profile-form").style.display = "none";
    });
  document.getElementById("cancel-edit-donor").addEventListener("click", () => {
    document.getElementById("edit-donor-form").style.display = "none";
  });
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  ui.openTab("donor-login");

  // Make UI functions globally available for onclick attributes
  window.ui = ui;
});
