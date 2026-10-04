const Stripe=require('stripe');

module.exports=async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 try{
  const {uploadId,email}=req.body||{};
  if(!uploadId||!email)return res.status(400).json({error:'Missing upload information'});

  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);

  const session=await stripe.checkout.sessions.create({
   mode:'payment',
   customer_email:email,
   line_items:[{
    price_data:{
     currency:'aud',
     product_data:{name:'AI Solar Quote Analysis'},
     unit_amount:990
    },
    quantity:1
   }],
   success_url:`${process.env.NEXT_PUBLIC_SITE_URL||'https://ai-solar-analysis-fixed-functional.vercel.app'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
   cancel_url:`${process.env.NEXT_PUBLIC_SITE_URL||'https://ai-solar-analysis-fixed-functional.vercel.app'}/upload.html`,
   metadata:{uploadId}
  });

  res.status(200).json({url:session.url});
 }catch(e){
  console.error(e);
  res.status(500).json({error:'Unable to start payment'});
 }
};
