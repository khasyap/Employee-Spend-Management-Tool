const QRCode = require('qrcode');

const data = {
  amount: 250,
  date: new Date().toISOString().slice(0, 10),
  vendor: "Amazon"
};

// Save QR as an image file
QRCode.toFile("bill.png", JSON.stringify(data), function (err) {
  if (err) throw err;
  console.log("✅ QR Code saved as bill.png");
});
