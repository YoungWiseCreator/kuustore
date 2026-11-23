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
    setTimeout(function(){ els.forEach(function(el){ el.classList.add('in'); }); }, 2500);
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
    if(formId==='lead-booking'){
      // Booking lead-time law (Cameron, 2026-11-23): every booking is at
      // least 3 days (72 hours) out — the window is how we match the
      // customer with a technician in their area. The bookings spine
      // enforces the same rule server-side; this is the first gate.
      var whenEl=document.getElementById('b-when');
      var whenTs=whenEl && whenEl.value ? new Date(whenEl.value).getTime() : NaN;
      if(isNaN(whenTs) || whenTs < Date.now()+72*3600*1000){
        status.className='form-status err'; status.textContent='Please choose a day and time at least 3 days from now — the earliest appointment we offer is 3 days out, and that window lets us match you with a technician in your area.'; return;
      }
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
          status.textContent='Request received — thank you. KuuStore will confirm your details by call, text or email before anything is charged. No payment is taken on this page. Your booked time is guaranteed: if an earlier slot opens in your area — even next-day — we will personally call and text you to offer it, and moving to it is free of charge.';
        } else if(res.j && formId==='lead-booking' && (res.j.error==='too-soon' || res.j.error==='bad-when')){
          status.className='form-status err';
          status.textContent='That time is inside our 3-day booking window — please choose a day and time at least 3 days from now, so we can match you with a technician in your area.';
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
  // Earliest selectable booking time = now + 72 hours (see the submit
  // check in kuuWireLeadForm and the spine's server-side rule).
  var whenInput=document.getElementById('b-when');
  if(whenInput){
    var minWhen=new Date(Date.now()+72*3600*1000);
    var pad=function(n){ return (n<10?'0':'')+n; };
    whenInput.min=minWhen.getFullYear()+'-'+pad(minWhen.getMonth()+1)+'-'+pad(minWhen.getDate())+'T'+pad(minWhen.getHours())+':'+pad(minWhen.getMinutes());
  }
  kuuWireLeadForm('lead-booking','KuuStore Booking', function(val){
    return 'Service: '+val('b-service')+' | Preferred: '+val('b-when')+' | Notes: '+val('b-notes')+' | Early-slot list: yes';
  });
  kuuWireLeadForm('lead-apply','KuuStore Technician Application', function(val){
    return 'Role: '+val('j-role')+' | License/cert: '+val('j-lic')+' | ZIP: '+val('j-zip')+' | Availability: '+val('j-avail');
  });
});

/* STITCH TRANSPLANT 2026-11-21 — language switch becomes a click-to-open
   DROPDOWN (Cameron toggle-form law 2026-11-21 12:46 EST). The existing
   .lang-btn buttons keep their classes, data-lang values, order and click
   handlers; they are only re-housed inside a menu that opens on click.
   The toggle button carries data-i18n-skip so text-node translation
   walkers never count it. */
document.addEventListener('DOMContentLoaded', function () {
  var sw = document.querySelector('.lang-switch');
  if (!sw || sw.classList.contains('lang-dropdown')) return;
  sw.classList.add('lang-dropdown');
  var menu = document.createElement('span');
  menu.className = 'lang-menu';
  Array.prototype.slice.call(sw.querySelectorAll('.lang-btn')).forEach(function (b) { menu.appendChild(b); });
  var toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'lang-toggle';
  toggle.setAttribute('aria-haspopup', 'true');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('data-i18n-skip', '');
  toggle.setAttribute('aria-label', 'Choose language');
  function label() {
    var a = sw.querySelector('.lang-btn.active');
    toggle.textContent = (a ? a.textContent : 'EN') + ' \u25BE';
  }
  label();
  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = sw.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.addEventListener('click', function (e) {
    if (!sw.contains(e.target)) { sw.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { sw.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
  });
  menu.addEventListener('click', function () {
    sw.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    setTimeout(label, 0);
  });
  sw.appendChild(toggle);
  sw.appendChild(menu);
});
