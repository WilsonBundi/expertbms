/**
 * Blood Donor Management System - Frontend Script
 * Works with Node.js backend at http://localhost:3000
 * Includes Donor, Admin, and Hospital functionality
 */

// Configuration
const config = {
  apiBaseUrl: "http://localhost:3000/api",
  minSearchChars: 2,
  bloodTypes: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  requestUrgencyLevels: ['normal', 'urgent', 'emergency'],
  seriousConditions: [
    "hiv", "aids", "hepatitis", "cancer", 
    "heart disease", "malaria", "ebola",
    "hemophilia", "tuberculosis"
  ],
};

// State Management
const state = {
  currentUser: null,
  userType: null, // 'donor', 'admin', or 'hospital'
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
    hospitalLogin: document.getElementById("hospitalLoginForm"),
    hospitalRegister: document.getElementById("hospitalRegisterForm"),
    updateDonor: document.getElementById("updateDonorForm"),
    adminUpdateDonor: document.getElementById("adminUpdateDonorForm"),
    updateHospital: document.getElementById("updateHospitalForm"),
    bloodRequest: document.getElementById("bloodRequestForm"),
    updateInventory: document.getElementById("updateInventoryForm"),
  },
  dashboards: {
    donor: document.getElementById("donor-dashboard"),
    admin: document.getElementById("admin-dashboard"),
    hospital: document.getElementById("hospital-dashboard"),
  },
};

// Utility Functions
const utils = {
  validateEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  validatePhone: (phone) => /^[\d\s\-\(\)]{8,}$/.test(phone),
  validatePassword: (password) => password.length >= 8,

  hasSeriousCondition: (medicalHistory) => {
    if (!medicalHistory) return false;
    const lowerHistory = medicalHistory.toLowerCase();
    return config.seriousConditions.some(condition => 
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

  showAlert: (message, type = 'info') => {
    const alertBox = document.createElement('div');
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
    document.body.prepend(alertBox);
    setTimeout(() => alertBox.remove(), 5000);
  },

  formatDate: (dateString) => new Date(dateString).toLocaleDateString(),

  populateSelect: (selectId, options, selectedValue = '') => {
    const select = document.getElementById(selectId);
    select.innerHTML = options.map(option => 
      `<option value="${option}" ${option === selectedValue ? 'selected' : ''}>${option}</option>`
    ).join('');
  }
};

// API Service
const apiService = {
  async request(endpoint, method = "GET", body = null) {
    const url = `${config.apiBaseUrl}${endpoint}`;
    const options = {
      method,
      headers: { "Content-Type": "application/json" },
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
      utils.showAlert(error.message, 'error');
      throw error;
    } finally {
      utils.hideLoading();
    }
  },

  // Donor Endpoints
  donorLogin: (email, phone) => apiService.request("/donor/login", "POST", { email, phone }),
  registerDonor: (donorData) => apiService.request("/donor/register", "POST", donorData),
  getDonor: (id) => apiService.request(`/donor/${id}`),
  updateDonor: (id, updateData) => apiService.request(`/donor/${id}`, "PUT", updateData),

  // Admin Endpoints
  adminLogin: (username, password) => apiService.request("/admin/login", "POST", { username, password }),
  getAllDonors: () => apiService.request("/admin/donors"),
  searchDonors: (query) => apiService.request(`/admin/donors/search?q=${encodeURIComponent(query)}`),
  adminUpdateDonor: (donorId, updateData) => apiService.request(`/admin/donors/${donorId}`, "PUT", updateData),

  // Hospital Endpoints
  hospitalLogin: (email, password) => apiService.request("/hospital/login", "POST", { email, password }),
  registerHospital: (hospitalData) => apiService.request("/hospital/register", "POST", hospitalData),
  getHospital: (id) => apiService.request(`/hospital/${id}`),
  updateHospital: (id, updateData) => apiService.request(`/hospital/${id}`, "PUT", updateData),
  getHospitalInventory: (id) => apiService.request(`/hospital/${id}/inventory`),
  updateHospitalInventory: (id, inventoryData) => apiService.request(`/hospital/${id}/inventory`, "PUT", inventoryData),
  createBloodRequest: (id, requestData) => apiService.request(`/hospital/${id}/requests`, "POST", requestData),
  getHospitalRequests: (id) => apiService.request(`/hospital/${id}/requests`),
};

// UI Functions
const ui = {
  // Tab Management
  openTab: (tabId) => {
    // Hide all tab contents
    document.querySelectorAll(".tab-content").forEach(tab => {
      tab.classList.remove("active");
    });

    // Deactivate all tab buttons
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.classList.remove("active");
    });

    // Show the selected tab content
    document.getElementById(tabId).classList.add("active");

    // Activate the clicked button
    event.currentTarget.classList.add("active");
  },

  // Dashboard Management
  showDashboard: (type) => {
    // Hide all tabs and dashboards
    elements.tabs.container.style.display = "none";
    Object.values(elements.dashboards).forEach(dashboard => {
      dashboard.style.display = "none";
    });

    // Show the requested dashboard
    elements.dashboards[type].style.display = "block";
  },

  // Donor UI Functions
  showDonorDashboard: async (donor) => {
    try {
      const data = await apiService.getDonor(donor.id);
      
      if (data.success) {
        state.currentUser = data.donor;
        state.userType = 'donor';
        
        // Display profile
        document.getElementById("donor-profile").innerHTML = `
          <p><strong>Name:</strong> ${data.donor.name}</p>
          <p><strong>Email:</strong> ${data.donor.email}</p>
          <p><strong>Phone:</strong> ${data.donor.phone}</p>
          <p><strong>Blood Type:</strong> ${data.donor.blood_type}</p>
          <p><strong>Medical History:</strong> ${data.donor.medical_history || "None"}</p>
        `;

        // Display donation history
        const historyTable = document.querySelector("#donation-history-table tbody");
        historyTable.innerHTML = data.donations.length > 0
          ? data.donations.map(donation => `
              <tr>
                <td>${utils.formatDate(donation.donation_date)}</td>
                <td>${donation.quantity_ml} ml</td>
              </tr>
            `).join('')
          : '<tr><td colspan="2">No donation history</td></tr>';

        // Set edit form values
        document.getElementById("edit-name").value = data.donor.name;
        document.getElementById("edit-phone").value = data.donor.phone;
        document.getElementById("edit-medical-history").value = data.donor.medical_history || "";

        ui.showDashboard('donor');
      }
    } catch (error) {
      console.error("Error loading donor dashboard:", error);
    }
  },

  // Admin UI Functions
  showAdminDashboard: async () => {
    try {
      const data = await apiService.getAllDonors();
      
      if (data.success) {
        state.userType = 'admin';
        
        // Populate donors table
        const donorsTable = document.querySelector("#donors-table tbody");
        donorsTable.innerHTML = data.donors.length > 0
          ? data.donors.map(donor => `
              <tr>
                <td>${donor.name}</td>
                <td>${donor.email}</td>
                <td>${donor.phone}</td>
                <td>${donor.blood_type}</td>
                <td>
                  <button onclick="ui.showEditDonorModal(${donor.id})">Edit</button>
                </td>
              </tr>
            `).join('')
          : '<tr><td colspan="5">No donors found</td></tr>';

        ui.showDashboard('admin');
      }
    } catch (error) {
      console.error("Error loading admin dashboard:", error);
    }
  },

  showEditDonorModal: async (donorId) => {
    try {
      const data = await apiService.getDonor(donorId);
      
      if (data.success) {
        // Populate form
        document.getElementById("edit-donor-id").value = donorId;
        document.getElementById("admin-edit-name").value = data.donor.name;
        document.getElementById("admin-edit-email").value = data.donor.email;
        document.getElementById("admin-edit-phone").value = data.donor.phone;
        utils.populateSelect("admin-edit-blood-type", config.bloodTypes, data.donor.blood_type);
        document.getElementById("admin-edit-medical-history").value = data.donor.medical_history || "";

        // Show modal
        document.getElementById("edit-donor-form").style.display = "block";
      }
    } catch (error) {
      console.error("Error loading donor data:", error);
    }
  },

  // Hospital UI Functions
  showHospitalDashboard: async (hospital) => {
    try {
      const [profileData, inventoryData, requestsData] = await Promise.all([
        apiService.getHospital(hospital.id),
        apiService.getHospitalInventory(hospital.id),
        apiService.getHospitalRequests(hospital.id)
      ]);
      
      if (profileData.success) {
        state.currentUser = profileData.hospital;
        state.userType = 'hospital';
        
        // Display profile
        document.getElementById("hospital-profile").innerHTML = `
          <p><strong>Hospital Name:</strong> ${profileData.hospital.name}</p>
          <p><strong>Email:</strong> ${profileData.hospital.email}</p>
          <p><strong>Address:</strong> ${profileData.hospital.address}</p>
          <p><strong>Phone:</strong> ${profileData.hospital.phone}</p>
          <p><strong>Contact Person:</strong> ${profileData.hospital.contact_person}</p>
        `;

        // Set edit form values
        document.getElementById("edit-hosp-name").value = profileData.hospital.name;
        document.getElementById("edit-hosp-address").value = profileData.hospital.address;
        document.getElementById("edit-hosp-phone").value = profileData.hospital.phone;
        document.getElementById("edit-hosp-contact").value = profileData.hospital.contact_person;

        // Display inventory
        const inventoryTable = document.querySelector("#blood-inventory-table tbody");
        inventoryTable.innerHTML = inventoryData.inventory.length > 0
          ? inventoryData.inventory.map(item => `
              <tr>
                <td>${item.blood_type}</td>
                <td>${item.quantity_ml} ml</td>
                <td>${utils.formatDate(item.last_updated)}</td>
              </tr>
            `).join('')
          : '<tr><td colspan="3">No inventory data</td></tr>';

        // Display requests
        const requestsTable = document.querySelector("#blood-requests-table tbody");
        requestsTable.innerHTML = requestsData.requests.length > 0
          ? requestsData.requests.map(request => `
              <tr>
                <td>${utils.formatDate(request.request_date)}</td>
                <td>${request.blood_type}</td>
                <td>${request.quantity_ml} ml</td>
                <td>${request.status}</td>
                <td><button class="btn-view">View</button></td>
              </tr>
            `).join('')
          : '<tr><td colspan="5">No requests found</td></tr>';

        // Prepare blood request form
        utils.populateSelect("request-blood-type", config.bloodTypes);
        utils.populateSelect("request-urgency", config.requestUrgencyLevels);

        ui.showDashboard('hospital');
      }
    } catch (error) {
      console.error("Error loading hospital dashboard:", error);
    }
  },

  // Common Functions
  logout: () => {
    state.currentUser = null;
    state.userType = null;
    
    // Reset forms
    Object.values(elements.forms).forEach(form => form.reset());
    
    // Show login tabs
    elements.tabs.container.style.display = "flex";
    ui.openTab("donor-login");
    
    // Hide all dashboards
    Object.values(elements.dashboards).forEach(dashboard => {
      dashboard.style.display = "none";
    });
  },

  // Form Visibility Toggles
  showEditProfile: () => {
    document.getElementById("edit-profile-form").style.display = "block";
  },
  hideEditProfile: () => {
    document.getElementById("edit-profile-form").style.display = "none";
  },
  showRequestBloodForm: () => {
    document.getElementById("request-blood-form").style.display = "block";
  },
  hideRequestBloodForm: () => {
    document.getElementById("request-blood-form").style.display = "none";
  },
  hideAdminEditForm: () => {
    document.getElementById("edit-donor-form").style.display = "none";
  }
};

// Event Listeners
const setupEventListeners = () => {
  // Tab switching
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", function() {
      const tabId = this.getAttribute("onclick").match(/openTab\('([^']+)'\)/)[1];
      ui.openTab(tabId);
    });
  });

  // Donor Login
  elements.forms.donorLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("donor-email").value;
    const phone = document.getElementById("donor-phone").value;

    try {
      const data = await apiService.donorLogin(email, phone);
      if (data.success) {
        await ui.showDonorDashboard(data.donor);
      }
    } catch (error) {
      console.error("Donor login failed:", error);
    }
  });

  // Donor Registration
  elements.forms.donorRegister.addEventListener("submit", async (e) => {
    e.preventDefault();
    const donorData = {
      name: document.getElementById("reg-name").value,
      email: document.getElementById("reg-email").value,
      phone: document.getElementById("reg-phone").value,
      blood_type: document.getElementById("reg-blood-type").value,
      medical_history: document.getElementById("reg-medical-history").value,
    };

    try {
      const data = await apiService.registerDonor(donorData);
      if (data.success) {
        utils.showAlert("Registration successful! Please login.", 'success');
        ui.openTab("donor-login");
        elements.forms.donorRegister.reset();
      }
    } catch (error) {
      console.error("Donor registration failed:", error);
    }
  });

  // Admin Login
  elements.forms.adminLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("admin-username").value;
    const password = document.getElementById("admin-password").value;

    try {
      const data = await apiService.adminLogin(username, password);
      if (data.success) {
        await ui.showAdminDashboard();
      }
    } catch (error) {
      console.error("Admin login failed:", error);
    }
  });

  // Hospital Login
  elements.forms.hospitalLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("hospital-email").value;
    const password = document.getElementById("hospital-password").value;

    try {
      const data = await apiService.hospitalLogin(email, password);
      if (data.success) {
        await ui.showHospitalDashboard(data.hospital);
      }
    } catch (error) {
      console.error("Hospital login failed:", error);
    }
  });

  // Hospital Registration
  elements.forms.hospitalRegister.addEventListener("submit", async (e) => {
    e.preventDefault();
    const hospitalData = {
      name: document.getElementById("reg-hosp-name").value,
      email: document.getElementById("reg-hosp-email").value,
      password: document.getElementById("reg-hosp-password").value,
      address: document.getElementById("reg-hosp-address").value,
      phone: document.getElementById("reg-hosp-phone").value,
      contact_person: document.getElementById("reg-hosp-contact").value,
    };

    try {
      const data = await apiService.registerHospital(hospitalData);
      if (data.success) {
        utils.showAlert("Registration successful! Please login.", 'success');
        ui.openTab("hospital-login");
        elements.forms.hospitalRegister.reset();
      }
    } catch (error) {
      console.error("Hospital registration failed:", error);
    }
  });

  // Update Donor Profile
  elements.forms.updateDonor.addEventListener("submit", async (e) => {
    e.preventDefault();
    const updateData = {
      name: document.getElementById("edit-name").value,
      phone: document.getElementById("edit-phone").value,
      medical_history: document.getElementById("edit-medical-history").value,
    };

    try {
      const data = await apiService.updateDonor(state.currentUser.id, updateData);
      if (data.success) {
        utils.showAlert("Profile updated successfully!", 'success');
        ui.hideEditProfile();
        await ui.showDonorDashboard({...state.currentUser, ...updateData});
      }
    } catch (error) {
      console.error("Profile update failed:", error);
    }
  });

  // Admin Update Donor
  elements.forms.adminUpdateDonor.addEventListener("submit", async (e) => {
    e.preventDefault();
    const donorId = document.getElementById("edit-donor-id").value;
    const updateData = {
      name: document.getElementById("admin-edit-name").value,
      email: document.getElementById("admin-edit-email").value,
      phone: document.getElementById("admin-edit-phone").value,
      blood_type: document.getElementById("admin-edit-blood-type").value,
      medical_history: document.getElementById("admin-edit-medical-history").value,
    };

    try {
      const data = await apiService.adminUpdateDonor(donorId, updateData);
      if (data.success) {
        utils.showAlert("Donor updated successfully!", 'success');
        ui.hideAdminEditForm();
        await ui.showAdminDashboard();
      }
    } catch (error) {
      console.error("Donor update failed:", error);
    }
  });

  // Update Hospital Profile
  elements.forms.updateHospital.addEventListener("submit", async (e) => {
    e.preventDefault();
    const updateData = {
      name: document.getElementById("edit-hosp-name").value,
      address: document.getElementById("edit-hosp-address").value,
      phone: document.getElementById("edit-hosp-phone").value,
      contact_person: document.getElementById("edit-hosp-contact").value,
    };

    try {
      const data = await apiService.updateHospital(state.currentUser.id, updateData);
      if (data.success) {
        utils.showAlert("Hospital profile updated successfully!", 'success');
        await ui.showHospitalDashboard({...state.currentUser, ...updateData});
      }
    } catch (error) {
      console.error("Hospital update failed:", error);
    }
  });

  // Create Blood Request
  elements.forms.bloodRequest.addEventListener("submit", async (e) => {
    e.preventDefault();
    const requestData = {
      blood_type: document.getElementById("request-blood-type").value,
      quantity_ml: document.getElementById("request-quantity").value,
      urgency: document.getElementById("request-urgency").value,
      notes: document.getElementById("request-notes").value,
    };

    try {
      const data = await apiService.createBloodRequest(state.currentUser.id, requestData);
      if (data.success) {
        utils.showAlert("Blood request submitted successfully!", 'success');
        ui.hideRequestBloodForm();
        await ui.showHospitalDashboard(state.currentUser);
      }
    } catch (error) {
      console.error("Blood request failed:", error);
    }
  });

  // Update Inventory
  elements.forms.updateInventory.addEventListener("submit", async (e) => {
    e.preventDefault();
    const inventoryData = {
      blood_type: document.getElementById("inventory-blood-type").value,
      quantity_ml: document.getElementById("inventory-quantity").value,
    };

    try {
      const data = await apiService.updateHospitalInventory(state.currentUser.id, inventoryData);
      if (data.success) {
        utils.showAlert("Inventory updated successfully!", 'success');
        await ui.showHospitalDashboard(state.currentUser);
      }
    } catch (error) {
      console.error("Inventory update failed:", error);
    }
  });

  // Search Donors
  document.getElementById("search-donor").addEventListener("input", async (e) => {
    const query = e.target.value.trim();
    if (query.length >= config.minSearchChars) {
      try {
        const data = await apiService.searchDonors(query);
        if (data.success) {
          const donorsTable = document.querySelector("#donors-table tbody");
          donorsTable.innerHTML = data.donors.map(donor => `
            <tr>
              <td>${donor.name}</td>
              <td>${donor.email}</td>
              <td>${donor.phone}</td>
              <td>${donor.blood_type}</td>
              <td>
                <button onclick="ui.showEditDonorModal(${donor.id})">Edit</button>
              </td>
            </tr>
          `).join('');
        }
      } catch (error) {
        console.error("Search failed:", error);
      }
    } else if (query.length === 0) {
      ui.loadAllDonors();
    }
  });

  // Logout button
  document.querySelectorAll(".logout-btn").forEach(btn => {
    btn.addEventListener("click", ui.logout);
  });
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  ui.openTab("donor-login");

  // Make UI functions globally available for onclick attributes
  window.ui = ui;
});
