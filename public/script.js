// Tab functionality
function openTab(tabId) {
  // Hide all tab contents
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Deactivate all tab buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Show the selected tab content
  document.getElementById(tabId).classList.add("active");

  // Activate the clicked button
  event.currentTarget.classList.add("active");
}

// Current user data
let currentUser = null;

// Donor Login
document
  .getElementById("donorLoginForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("donor-email").value;
    const phone = document.getElementById("donor-phone").value;

    try {
      const response = await fetch("/api/donor/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, phone }),
      });

      const data = await response.json();

      if (data.success) {
        currentUser = data.donor;
        showDonorDashboard(data.donor);
      } else {
        alert(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred during login");
    }
  });

// Donor Registration
document
  .getElementById("donorRegisterForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const donorData = {
      name: document.getElementById("reg-name").value,
      email: document.getElementById("reg-email").value,
      phone: document.getElementById("reg-phone").value,
      blood_type: document.getElementById("reg-blood-type").value,
      medical_history: document.getElementById("reg-medical-history").value,
    };

    try {
      const response = await fetch("/api/donor/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(donorData),
      });

      const data = await response.json();

      if (data.success) {
        alert(
          "Registration successful! Please login with your email and phone."
        );
        openTab("donor-login");
        document.getElementById("donorRegisterForm").reset();
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred during registration");
    }
  });

// Admin Login


// Admin Login
document.getElementById('adminLoginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value;
    
    // Basic validation
    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('Admin login successful', data);
            showAdminDashboard();
        } else {
            console.error('Admin login failed:', data.message);
            alert(data.message || 'Login failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Admin login error:', error);
        alert('An error occurred during login. Please try again.');
    }
});

// Show donor dashboard
async function showDonorDashboard(donor) {
  try {
    // Fetch donor details and donation history
    const response = await fetch(`/api/donor/${donor.id}`);
    const data = await response.json();

    if (data.success) {
      // Display profile information
      const profileHtml = `
                <p><strong>Name:</strong> ${data.donor.name}</p>
                <p><strong>Email:</strong> ${data.donor.email}</p>
                <p><strong>Phone:</strong> ${data.donor.phone}</p>
                <p><strong>Blood Type:</strong> ${data.donor.blood_type}</p>
                <p><strong>Medical History:</strong> ${
                  data.donor.medical_history || "None"
                }</p>
            `;
      document.getElementById("donor-profile").innerHTML = profileHtml;

      // Populate donation history
      const historyTable = document.querySelector(
        "#donation-history-table tbody"
      );
      historyTable.innerHTML = "";

      if (data.donations.length > 0) {
        data.donations.forEach((donation) => {
          const row = document.createElement("tr");
          row.innerHTML = `
                        <td>${new Date(
                          donation.donation_date
                        ).toLocaleDateString()}</td>
                        <td>${donation.quantity_ml}</td>
                    `;
          historyTable.appendChild(row);
        });
      } else {
        const row = document.createElement("tr");
        row.innerHTML = '<td colspan="2">No donation history found</td>';
        historyTable.appendChild(row);
      }

      // Set values for edit form
      document.getElementById("edit-name").value = data.donor.name;
      document.getElementById("edit-phone").value = data.donor.phone;
      document.getElementById("edit-medical-history").value =
        data.donor.medical_history || "";

      // Show dashboard and hide other sections
      document.getElementById("donor-dashboard").style.display = "block";
      document.querySelector(".tabs").style.display = "none";
      document.querySelectorAll(".tab-content").forEach((tab) => {
        tab.style.display = "none";
      });
    } else {
      alert(data.message || "Failed to load donor data");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred while loading the dashboard");
  }
}

// Show admin dashboard


async function showAdminDashboard() {
	try {
		// Fetch all donors
		const response = await fetch('/api/admin/donors');
		const data = await response.json();
        
		if (data.success) {
			// Populate donors table
			const donorsTable = document.querySelector('#donors-table tbody');
			donorsTable.innerHTML = '';
            
			data.donors.forEach(donor => {
				const row = document.createElement('tr');
				row.innerHTML = `
                    <td>${donor.name}</td>
                    <td>${donor.email}</td>
                    <td>${donor.phone}</td>
                    <td>${donor.blood_type}</td>
                    <td>
                        <button onclick="showEditDonorForm(${donor.id})">Edit</button>
                    </td>
                `;
				donorsTable.appendChild(row);
			});
            
			// Show dashboard and hide other sections
			document.getElementById('admin-dashboard').style.display = 'block';
			document.querySelector('.tabs').style.display = 'none';
			document.querySelectorAll('.tab-content').forEach(tab => {
				tab.style.display = 'none';
			});
            
			// Initialize search functionality
			document.getElementById('search-donor').addEventListener('keypress', function (e) {
				if (e.key === 'Enter') {
					searchDonors();
				}
			});
		} else {
			alert(data.message || 'Failed to load donors data');
		}
	} catch (error) {
		console.error('Error loading admin dashboard:', error);
		alert('Error loading admin dashboard. Please try again.');
	}
}

// Search donors
async function searchDonors() {
  const query = document.getElementById("search-donor").value.trim();

  if (query.length === 0) {
    showAdminDashboard();
    return;
  }

  try {
    const response = await fetch(
      `/api/admin/donors/search?q=${encodeURIComponent(query)}`
    );
    const data = await response.json();

    if (data.success) {
      const donorsTable = document.querySelector("#donors-table tbody");
      donorsTable.innerHTML = "";

      data.donors.forEach((donor) => {
        const row = document.createElement("tr");
        row.innerHTML = `
                    <td>${donor.name}</td>
                    <td>${donor.email}</td>
                    <td>${donor.phone}</td>
                    <td>${donor.blood_type}</td>
                    <td>
                        <button onclick="showEditDonorForm(${donor.id})">Edit</button>
                    </td>
                `;
        donorsTable.appendChild(row);
      });
    } else {
      alert(data.message || "Search failed");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred during search");
  }
}

// Show edit profile form
function showEditProfile() {
  document.getElementById("edit-profile-form").style.display = "block";

  // Set up form submission
  document
    .getElementById("updateDonorForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      const updatedData = {
        name: document.getElementById("edit-name").value,
        phone: document.getElementById("edit-phone").value,
        medical_history: document.getElementById("edit-medical-history").value,
      };

      try {
        const response = await fetch(`/api/donor/${currentUser.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedData),
        });

        const data = await response.json();

        if (data.success) {
          alert("Profile updated successfully!");
          showDonorDashboard({ ...currentUser, ...updatedData });
          hideEditProfile();
        } else {
          alert(data.message || "Update failed");
        }
      } catch (error) {
        console.error("Error:", error);
        alert("An error occurred during update");
      }
    });
}

// Hide edit profile form
function hideEditProfile() {
  document.getElementById("edit-profile-form").style.display = "none";
}

// Show edit donor form (admin)
async function showEditDonorForm(donorId) {
  try {
    const response = await fetch(`/api/donor/${donorId}`);
    const data = await response.json();

    if (data.success) {
      document.getElementById("edit-donor-id").value = donorId;
      document.getElementById("admin-edit-name").value = data.donor.name;
      document.getElementById("admin-edit-email").value = data.donor.email;
      document.getElementById("admin-edit-phone").value = data.donor.phone;
      document.getElementById("admin-edit-blood-type").value =
        data.donor.blood_type;
      document.getElementById("admin-edit-medical-history").value =
        data.donor.medical_history || "";

      document.getElementById("edit-donor-form").style.display = "block";

      // Scroll to form
      document
        .getElementById("edit-donor-form")
        .scrollIntoView({ behavior: "smooth" });
    } else {
      alert(data.message || "Failed to load donor data");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred while loading donor data");
  }

  // Set up form submission
  document
    .getElementById("adminUpdateDonorForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      const updatedData = {
        name: document.getElementById("admin-edit-name").value,
        email: document.getElementById("admin-edit-email").value,
        phone: document.getElementById("admin-edit-phone").value,
        blood_type: document.getElementById("admin-edit-blood-type").value,
        medical_history: document.getElementById("admin-edit-medical-history")
          .value,
      };

      const donorId = document.getElementById("edit-donor-id").value;

      try {
        const response = await fetch(`/api/admin/donors/${donorId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedData),
        });

        const data = await response.json();

        if (data.success) {
          alert("Donor updated successfully!");
          hideAdminEditForm();
          showAdminDashboard();
        } else {
          alert(data.message || "Update failed");
        }
      } catch (error) {
        console.error("Error:", error);
        alert("An error occurred during update");
      }
    });
}

// Hide admin edit form
function hideAdminEditForm() {
  document.getElementById("edit-donor-form").style.display = "none";
}

// Logout
function logout() {
  currentUser = null;

  // Show login tabs and hide dashboards
  document.querySelector(".tabs").style.display = "flex";
  document.getElementById("donor-dashboard").style.display = "none";
  document.getElementById("admin-dashboard").style.display = "none";

  // Reset forms
  document.getElementById("donorLoginForm").reset();
  document.getElementById("adminLoginForm").reset();

  // Show login tab
  openTab("donor-login");
}
