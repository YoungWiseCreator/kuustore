// KuuStore calculators. Travel-fee model removed 2026-11-11: Cameron ruling 2026-11-09 (come-to-us shop model) — beauty services are not mobile, no travel fee applies. Dead calcTravel/milesForZip/travelFee removed (was flagged by Track C).
function calcEarn(){
  var price = parseFloat(document.getElementById('ec-price').value);
  var out = document.getElementById('ec-out');
  if(isNaN(price)||price<=0){ out.innerHTML = "Enter a service price.<small>Technicians keep 70% of every payment on KuuStore.</small>"; return; }
  var keep = (price*0.70).toFixed(2);
  out.innerHTML = "You keep $"+keep+" of $"+price.toFixed(2)+"<small>That is the 70% KuuStore split, before any tips, which are yours in full (policy placeholder - confirm at onboarding).</small>";
}
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('.panel, section.block h2, .calc, figure.drawn, .placeholder').forEach(function(n){ n.classList.add('reveal'); });
  var els = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} }); },{threshold:.12});
    els.forEach(function(el){ io.observe(el); });
  } else { els.forEach(function(el){ el.classList.add('in'); }); }
  var ep=document.getElementById('ec-price'); if(ep){ ep.addEventListener('input', calcEarn); }
  if(document.getElementById('ec-out')) calcEarn();
});

// Lead forms (booking + team application) — fleet lead spine: POST https://bookings.chasethealgo.com/api/lead
// Payload shape per funnel-sweep: {site, name, phone, email, division, notes}.
// NOTE: the bookings API validates `site` against an allowlist and KuuStore has no custom domain yet,
// so delivery cannot be confirmed until the domain is registered with the bookings service.
// On any non-ok response the form shows an honest interim state and keeps the visitor's entries.
function kuuWireLeadForm(formId, division, buildNotes){
  var form=document.getElementById(formId); if(!form) return;
  form.addEventListener('submit', function(ev){
    ev.preventDefault();
    var status=form.querySelector('.form-status');
    var btn=form.querySelector('button[type="submit"]');
    function val(id){ var n=document.getElementById(id); return n? n.value.trim() : ""; }
    var name=val(formId==='lead-booking'?'b-name':'j-name');
    var contact=val(formId==='lead-booking'?'b-contact':'j-contact');
    if(formId==='lead-booking' && !document.getElementById('b-consent').checked){
      status.className='form-status err'; status.textContent='Please tick the contact-consent box so we can reply to your booking.'; return;
    }
    if(!name || !contact){ status.className='form-status err'; status.textContent='Please add your name and a phone number or email so we can reach you.'; return; }
    var isEmail=/@/.test(contact);
    var payload={ site: window.location.hostname || 'kuustore', name: name,
      email: isEmail? contact : '', phone: isEmail? '' : contact,
      division: division, notes: buildNotes(val) };
    btn.disabled=true; status.className='form-status'; status.textContent='Sending…';
    fetch('https://bookings.chasethealgo.com/api/lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ return {ok:r.ok && j.ok, j:j}; }); })
      .then(function(res){
        btn.disabled=false;
        if(res.ok){ form.reset(); status.className='form-status ok';
          status.textContent='Request received — thank you. KuuStore will confirm your details by call, text or email before anything is charged. No payment is taken on this page.';
        } else { throw new Error('not-ok'); }
      })
      .catch(function(){
        btn.disabled=false;
        try{ localStorage.setItem('kuu-'+formId, JSON.stringify(payload)); }catch(e){}
        status.className='form-status err';
        status.textContent='We could not confirm delivery just now — your details are saved in this browser and nothing was charged. Please try again in a moment; if it keeps failing, your request has not been sent yet.';
      });
  });
}
document.addEventListener('DOMContentLoaded', function(){
  kuuWireLeadForm('lead-booking','KuuStore Booking', function(val){
    return 'Service: '+val('b-service')+' | Preferred: '+val('b-when')+' | Notes: '+val('b-notes');
  });
  kuuWireLeadForm('lead-apply','KuuStore Technician Application', function(val){
    return 'Role: '+val('j-role')+' | License/cert: '+val('j-lic')+' | ZIP: '+val('j-zip')+' | Availability: '+val('j-avail');
  });
});
