const express = require("express");
const PDFDocument = require("pdfkit");
const axios = require("axios");
const { ObjectId } = require("mongodb");
const app = express();
const blobStream = require("blob-stream");
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/", async (req, res) => {
  res.json({
    success: true,
    message: "welcome to the server",
  });
});

app.post("/create", async (req, res) => {
  const data = req.body;
  const trxId = new ObjectId().toString();
  const initiatePayment = {
    success_url: "http://localhost:3000/success",
    fail_url: "http://localhost:3000/fail",
    cancel_url: "http://localhost:3000/cancel",
    store_id: "produ670e63d933156",
    store_passwd: "produ670e63d933156@ssl",
    total_amount: data[0]?.amount,
    currency: "USD",
    tran_id: trxId,
    cus_name: data[0]?.name,
    product_profile: "general",
    product_name: "Samsung Galaxy S24 Ultra",
    product_category: "Smart Phone",
    cus_email: "cust@yahoo.com",
    cus_add1: "Dhaka",
    cus_add2: "Dhaka",
    cus_city: "Dhaka",
    cus_state: "Dhaka",
    cus_postcode: "1000",
    cus_country: "Bangladesh",
    cus_phone: "01711111111",
    cus_fax: "01711111111",
    shipping_method: "NO",
    multi_card_name: "mastercard,visacard,amexcard",
    value_a: "ref001_A",
    value_b: "ref002_B",
    value_c: "ref003_C",
    value_d: "ref004_D",
  };
  const response = await axios({
    method: "POST",
    url: "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
    data: initiatePayment,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  res.json({
    success: true,
    data: response?.data?.GatewayPageURL,
  });
});

app.post("/success", async (req, res) => {
  const data = req.body;
  console.log(data);
  //   res.json({
  //     status: data?.status,
  //     message: "order purchased success!",
  //   });
  res.redirect("https://www.google.com");
});

app.post("/fail", async (req, res) => {
  const data = req.body;
  console.log(data);
  res.json({
    status: data?.status,
    message: "order has been failed!",
  });
});
app.post("/cancel", async (req, res) => {
  const data = req.body;
  console.log(data);
  res.json({
    status: data?.status,
    message: "order has been cancelled!",
  });
});


app.get("/pdf", async (req, res) => {
  const doc = new PDFDocument({ size: "A4", layout: "portrait" });
  res.setHeader("Content-Type", "application/pdf");
  doc.pipe(res);

  // Outside padding (margins)
  const outsidePadding = 30;
  const topMargin = 100; // Define top margin for the table

  // Table layout constants
  const pageWidth = doc.page.width - outsidePadding * 2;
  const margins = 10;
  const contentWidth = (pageWidth - margins) / 2;

  // Sample data for left and right columns
  const data = [
    {
      left: "Certification Body",
      right: "Seller of Certified Products",
      leftContent: "CLEAN GLOBE INTERNATIONAL (PTY) LTD.",
      rightContent: "Company XYZ\nAddress XYZ",
    },
    {
      left: "Buyer of Certified Products",
      right: "Shipping Weights",
      leftContent:
        "BONOBO\nLa Moignerie - 10 Imp Gd Jardin,\nSaint Malo 35400, Bretagne - France\nBuying on behalf of: Groupe BEAUMANOIR\nTE-ID: N/A\nLicense No.: N/A",
      rightContent: [
        "Gross Shipping Weight\n4,398.70 kg",
        "Net Shipping Weight\n3,926.10 kg",
        "Certified Weight\n1,792.77 kg",
      ],
    },
  ];

  // Load your background image (adjust the path)
  const backgroundImagePath = "./img/tc.png"; // Replace with your image path
  const imgWidth = doc.page.width;
  const imgHeight = doc.page.height;

  // Insert background image
  doc.image(backgroundImagePath, 0, 0, { width: imgWidth, height: imgHeight });

  // Calculate row heights
  const rowHeights = data.map((item) => {
    const leftHeight =
      doc.heightOfString(item.left + "\n" + item.leftContent) + margins * 2;
    const rightHeight = Array.isArray(item.rightContent)
      ? item.rightContent
          .map((content) => doc.heightOfString(content) + margins * 2)
          .reduce((a, b) => Math.max(a, b), 0)
      : doc.heightOfString(item.right + "\n" + item.rightContent) + margins * 2;
    return Math.max(leftHeight, rightHeight);
  });

  const startX = outsidePadding;
  let currentY = outsidePadding + topMargin; // Add top margin to the starting Y position

  // Function to draw a rectangle (for a cell)
  function drawCell(x, y, width, height) {
    doc.rect(x, y, width, height).stroke();
  }

  // Function to write text in the cell
  function writeText(text, x, y, width, height) {
    doc.text(text, x + margins / 2, y + margins / 2, {
      width: width - margins,
      align: "left",
      lineGap: 2,
    });
  }

  // Draw the table rows
  data.forEach((item, index) => {
    const rowHeight = rowHeights[index];

    // Draw left column
    drawCell(startX, currentY, contentWidth, rowHeight);
    writeText(
      item.left + "\n" + item.leftContent,
      startX,
      currentY,
      contentWidth,
      rowHeight
    );

    // Draw right column
    drawCell(startX + contentWidth, currentY, contentWidth, rowHeight);

    if (Array.isArray(item.rightContent)) {
      const weightMargin = margins / 2;
      let weightY = currentY + weightMargin;

      item.rightContent.forEach((content) => {
        const isNetWeight = content.startsWith("Net Shipping Weight");
        const weightHeight = rowHeight / item.rightContent.length;

        if (isNetWeight) {
          drawCell(
            startX + contentWidth,
            weightY,
            contentWidth,
            weightHeight - weightMargin
          );
        }
        writeText(
          content,
          startX + contentWidth,
          weightY,
          contentWidth,
          weightHeight - weightMargin
        );

        weightY += weightHeight;
      });
    } else {
      writeText(
        item.right + "\n" + item.rightContent,
        startX + contentWidth,
        currentY,
        contentWidth,
        rowHeight
      );
    }

    currentY += rowHeight; // Move down to the next row
  });

  // Declarations section
  const declarationHeight = 100;
  drawCell(startX, currentY, contentWidth * 2, declarationHeight);
  writeText(
    "Declarations by Certification Body",
    startX,
    currentY,
    contentWidth * 2,
    declarationHeight
  );

  currentY += declarationHeight;

  // Certified Input References section
  const referencesHeight = 50;
  drawCell(startX, currentY, contentWidth * 2, referencesHeight);
  writeText(
    "Certified Input References",
    startX,
    currentY,
    contentWidth * 2,
    referencesHeight
  );

  // Finalize the PDF
  doc.end();
});



app.listen(port, async () => {
  console.log(`Server listening on port ${port}`);
});
