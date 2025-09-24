const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

// Smarter OCR parser
const parseBill = async (input, fileName, isPath = false) => {
  try {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const ext = path.extname(fileName).toLowerCase();
    let text = "";

    if (ext === ".pdf") {
      // Handle both file path and buffer
      const buffer = isPath ? fs.readFileSync(input) : input;
      const data = await pdfParse(buffer);
      text = data.text;
    } else if ([".jpg", ".jpeg", ".png", ".tiff"].includes(ext)) {
      // Handle both file path and buffer
      const imageBuffer = isPath ? fs.readFileSync(input) : input;
      const result = await Tesseract.recognize(imageBuffer, "eng");
      text = result.data.text;
    }
    // --- 3. Parse amount from text ---
    let amount = null;
    const lines = text.split("\n");
    const amountKeywords = /(total|amount due|grand total|fee|balance)/i;

    for (let line of lines) {
      if (amountKeywords.test(line)) {
        let match = line.match(/(\$?\s?\d+(\.\d{1,2})?)/g);
        if (match) {
          amount = Math.max(...match.map(val => parseFloat(val.replace(/[^0-9.]/g, ""))));
          break;
        }
      }
    }

    // fallback: pick highest number if keywords not found
    if (!amount) {
      let amountMatch = text.match(/(\$?\s?\d+(\.\d{1,2})?)/g);
      if (amountMatch && amountMatch.length > 0) {
        amount = Math.max(...amountMatch.map(val => parseFloat(val.replace(/[^0-9.]/g, ""))));
      }
    }

    // --- 4. Parse date ---
    let dateMatch = text.match(
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})|([A-Za-z]{3,9}\s\d{1,2},\s\d{4})/
    );
    let date = dateMatch ? new Date(dateMatch[0]) : new Date();

    // --- 5. Vendor detection ---
    let vendor = "Unknown Vendor";
    const vendorKeywords = {
      "Hostel": /hostel/i,
      "Mess": /mess/i,
      "Fee Receipt": /fee receipt/i,
      "College": /college/i,
      "Amazon": /amazon/i,
      "Walmart": /walmart/i,
      "Starbucks": /starbucks/i,
      "Uber": /uber/i,
      "Lyft": /lyft/i,
      "Apple Store": /apple/i,
      "Google Play": /google/i,
      "Microsoft": /microsoft/i,
      "Adobe": /adobe/i,
      "Delta": /delta/i,
      "Hilton": /hilton/i,
      "Marriott": /marriott/i,
      "Expedia": /expedia/i
    };

    for (let [name, regex] of Object.entries(vendorKeywords)) {
      if (regex.test(text)) {
        vendor = name;
        break;
      }
    }

    // --- 6. Confidence scoring ---
    let confidence = (amount ? 0.9 : 0.7).toFixed(2);

    return {
      vendor,
      amount: amount || null,
      date,
      confidence,
      rawText: text.substring(0, 500)
    };

  } catch (error) {
    console.error("OCR processing error:", error);
    throw new Error(`Failed to process bill: ${error.message}`);
  }
};

module.exports = { parseBill };
