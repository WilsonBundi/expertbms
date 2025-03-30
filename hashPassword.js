const bcrypt = require('bcrypt');

async function hashNewPassword() {
    const newPassword = '12345'; // Change this to your intended password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log("New Hashed Password:", hashedPassword);
}

hashNewPassword();
