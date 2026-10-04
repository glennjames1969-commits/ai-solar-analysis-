const crypto=require('crypto');
const { put } = require('@vercel/blob');
const formidable = require('formidable');
const fs = require('fs');

module.exports = async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const form=formidable({multiples:false,keepExtensions:true,maxFileSize:12*1024*1024});
  form.parse(req,async(err,fields,files)=>{
    if(err) return res.status(400).json({error:'Could not read upload'});
    try{
      const quote=Array.isArray(files.quote)?files.quote[0]:files.quote;
      if(!quote) return res.status(400).json({error:'Please upload your solar quote'});
      const id=crypto.randomUUID();
      const quotePath=`quotes/${id}/${quote.originalFilename||'quote'}`;
      const quoteBlob=await put(quotePath,fs.createReadStream(quote.filepath),{access:'public',contentType:quote.mimetype||'application/octet-stream',addRandomSuffix:false});
      let billUrl=null;
      const bill=Array.isArray(files.bill)?files.bill[0]:files.bill;
      if(bill){
        const billPath=`quotes/${id}/bill-${bill.originalFilename||'bill'}`;
        const billBlob=await put(billPath,fs.createReadStream(bill.filepath),{access:'public',contentType:bill.mimetype||'application/octet-stream',addRandomSuffix:false});
        billUrl=billBlob.url;
      }
      const payload={id,quoteUrl:quoteBlob.url,billUrl,name:String(fields.name||''),email:String(fields.email||''),postcode:String(fields.postcode||'')};
      res.setHeader('Cache-Control','no-store'); return res.status(200).json({uploadId:Buffer.from(JSON.stringify(payload)).toString('base64url')});
    }catch(e){console.error(e);return res.status(500).json({error:'Upload failed'});}
  });
};
