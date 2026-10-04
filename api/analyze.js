const { put } = require('@vercel/blob');
const Stripe = require('stripe');
const OpenAI = require('openai');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { session_id } = req.body || {};

    if (!session_id) {
      return res.status(400).json({ error: 'Missing payment session' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'Payment has not been confirmed' });
    }

    const uploadId = session.metadata?.uploadId;

    if (!uploadId) {
      return res.status(400).json({ error: 'Missing upload information' });
    }

    const payload = JSON.parse(
      Buffer.from(uploadId, 'base64url').toString('utf8')
    );

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const fileResponse = await fetch(payload.quoteUrl);
    if (!fileResponse.ok) {
      throw new Error('Could not retrieve uploaded quote');
    }

    const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());

    const uploadedFile = await openai.files.create({
      file: new File(
        [fileBuffer],
        'solar-quote.pdf',
        { type: fileResponse.headers.get('content-type') || 'application/pdf' }
      ),
      purpose: 'user_data'
    });

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-6-luna',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_file',
              file_id: uploadedFile.id
            },
            {
              type: 'input_text',
              text: `
Analyse this solar quote for the customer.

Provide a clear, easy-to-understand report covering:

1. Solar system size
2. Number and brand of panels
3. Inverter brand and model
4. Battery details, if included
5. Estimated system performance
6. Price and value for money
7. Warranty information
8. Important inclusions and exclusions
9. Potential concerns or red flags
10. Questions the customer should ask the installer
11. Overall rating out of 10
12. Clear recommendation

Do not invent information that is not present in the quote.
Clearly say when information is unavailable.

Write for an Australian homeowner.
`
            }
          ]
        }
      ]
    });

    const reportText = response.output_text || 'Unable to generate report.';

    const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI Solar Analysis</title>
<style>
body{font-family:Arial,sans-serif;background:#071426;color:#fff;margin:0;padding:30px}
.container{max-width:850px;margin:auto}
.card{background:#10243d;border-radius:16px;padding:25px}
h1{color:#25a9ff}
pre{white-space:pre-wrap;font-family:Arial;font-size:16px;line-height:1.6}
</style>
</head>
<body>
<div class="container">
<div class="card">
<h1>AI Solar Analysis</h1>
<pre>${escapeHtml(reportText)}</pre>
</div>
</div>
</body>
</html>`;

    const reportBlob = await put(
      `reports/${payload.id}.html`,
      html,
      {
        access: 'public',
        contentType: 'text/html',
        addRandomSuffix: false
      }
    );

    if (
      process.env.RESEND_API_KEY &&
      process.env.REPORT_FROM_EMAIL &&
      payload.email
    ) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.REPORT_FROM_EMAIL,
          to: [payload.email],
          subject: 'Your AI Solar Analysis',
          html: `
            <h2>Your AI Solar Analysis is ready</h2>
            <p>Your solar quote has been analysed.</p>
            <p><a href="${reportBlob.url}">View your report</a></p>
          `
        })
      });
    }

    return res.status(200).json({
      success: true,
      reportUrl: reportBlob.url
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Analysis failed',
      details: error.message
    });
  }
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
