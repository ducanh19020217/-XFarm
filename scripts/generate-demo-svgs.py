import os

OUTPUT_DIR = "apps/web/public/demo"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_svg(filename, title, width, height, content):
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="100%" height="100%">
  <title>{title}</title>
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f0fdf4"/>
      <stop offset="100%" stop-color="#dcfce7"/>
    </linearGradient>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#e0f2fe"/>
      <stop offset="100%" stop-color="#bae6fd"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#064e3b" flood-opacity="0.12"/>
    </filter>
  </defs>
  <rect width="{width}" height="{height}" fill="url(#bgGrad)" rx="24"/>
{content}
</svg>"""
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)
    size_kb = os.path.getsize(path) / 1024
    print(f"Created {filename} ({size_kb:.1f} KB)")

# 1. rau-cai.svg
create_svg("rau-cai.svg", "Rau cải xanh tươi hữu cơ XFarm", 800, 600, """
  <!-- Background circle -->
  <circle cx="400" cy="300" r="220" fill="#bbf7d0" opacity="0.6"/>
  <!-- Leaf 1 Left -->
  <path d="M 330 460 C 260 380 230 240 310 160 C 360 200 370 320 360 460 Z" fill="#22c55e" filter="url(#shadow)"/>
  <path d="M 320 380 Q 300 280 310 170" stroke="#86efac" stroke-width="6" stroke-linecap="round" fill="none"/>
  <!-- Leaf 2 Right -->
  <path d="M 470 460 C 540 380 570 240 490 160 C 440 200 430 320 440 460 Z" fill="#16a34a" filter="url(#shadow)"/>
  <path d="M 480 380 Q 500 280 490 170" stroke="#86efac" stroke-width="6" stroke-linecap="round" fill="none"/>
  <!-- Leaf 3 Center -->
  <path d="M 370 480 C 330 340 340 200 400 120 C 460 200 470 340 430 480 Z" fill="#4ade80" filter="url(#shadow)"/>
  <path d="M 400 460 L 400 135" stroke="#bbf7d0" stroke-width="8" stroke-linecap="round"/>
  <!-- Stems base -->
  <path d="M 350 450 C 360 510 440 510 450 450 Z" fill="#f0fdf4" stroke="#86efac" stroke-width="4"/>
  <!-- Dew drops -->
  <circle cx="360" cy="220" r="10" fill="#e0f2fe" opacity="0.8"/>
  <circle cx="430" cy="280" r="8" fill="#e0f2fe" opacity="0.8"/>
""")

# 2. xa-lach.svg
create_svg("xa-lach.svg", "Xà lách mỡ tươi giòn Đà Lạt", 800, 600, """
  <circle cx="400" cy="300" r="230" fill="#dcfce7" opacity="0.8"/>
  <!-- Outer ruffled leaves -->
  <path d="M 240 340 C 210 240 280 180 340 210 C 390 150 470 170 490 220 C 560 200 600 280 570 360 C 600 440 520 490 460 470 C 410 510 330 490 290 440 C 220 440 210 370 240 340 Z" fill="#4ade80" filter="url(#shadow)"/>
  <!-- Middle layer -->
  <path d="M 280 330 C 260 260 320 220 370 240 C 410 200 460 210 480 250 C 530 250 540 320 520 370 C 540 420 480 460 430 440 C 380 470 320 440 300 400 C 260 390 260 350 280 330 Z" fill="#86efac"/>
  <!-- Inner heart leaves -->
  <ellipse cx="400" cy="340" rx="90" ry="80" fill="#bbf7d0"/>
  <path d="M 360 340 Q 400 310 440 340 Q 400 370 360 340 Z" fill="#fef08a" opacity="0.9"/>
  <!-- Leaf veins -->
  <path d="M 330 270 Q 370 310 400 340 Q 440 310 470 270" stroke="#f0fdf4" stroke-width="4" fill="none"/>
  <circle cx="370" cy="300" r="7" fill="#ffffff" opacity="0.7"/>
""")

# 3. ca-chua.svg
create_svg("ca-chua.svg", "Cà chua bi hữu cơ mọng nước", 800, 600, """
  <circle cx="400" cy="300" r="220" fill="#fee2e2" opacity="0.7"/>
  <!-- Main tomato 1 -->
  <circle cx="360" cy="340" r="130" fill="#ef4444" filter="url(#shadow)"/>
  <ellipse cx="320" cy="290" rx="35" ry="20" fill="#f87171" transform="rotate(-30 320 290)"/>
  <circle cx="310" cy="280" r="10" fill="#ffffff" opacity="0.6"/>
  <!-- Tomato 2 (smaller behind) -->
  <circle cx="490" cy="290" r="95" fill="#dc2626" filter="url(#shadow)"/>
  <ellipse cx="460" cy="250" rx="25" ry="14" fill="#f87171" transform="rotate(-30 460 250)"/>
  <!-- Tomato calyx & stem 1 -->
  <path d="M 360 215 L 340 180 L 360 200 L 320 200 L 350 215 L 340 230 L 365 218 L 385 235 L 375 215 L 400 205 L 370 200 L 375 180 Z" fill="#22c55e"/>
  <path d="M 360 205 Q 365 150 400 130" stroke="#16a34a" stroke-width="10" fill="none" stroke-linecap="round"/>
  <!-- Tomato calyx 2 -->
  <path d="M 490 200 L 475 175 L 490 190 L 460 190 L 485 200 L 480 215 L 495 205 L 510 215 L 500 200 L 520 190 L 500 188 Z" fill="#22c55e"/>
  <path d="M 490 195 Q 470 160 400 130" stroke="#16a34a" stroke-width="8" fill="none" stroke-linecap="round"/>
  <!-- Little vine leaves -->
  <path d="M 400 130 Q 430 110 460 120 Q 440 145 400 130" fill="#15803d"/>
""")

# 4. dua-luoi.svg
create_svg("dua-luoi.svg", "Dưa lưới ruột cam tiêu chuẩn VietGAP", 800, 600, """
  <circle cx="400" cy="300" r="220" fill="#fef3c7" opacity="0.6"/>
  <!-- Whole melon -->
  <circle cx="340" cy="310" r="140" fill="#84cc16" filter="url(#shadow)"/>
  <!-- Netting pattern -->
  <path d="M 230 310 Q 340 230 450 310 Q 340 390 230 310 Z" stroke="#ecfccb" stroke-width="4" fill="none"/>
  <path d="M 260 240 Q 340 310 420 380" stroke="#ecfccb" stroke-width="4" fill="none"/>
  <path d="M 260 380 Q 340 310 420 240" stroke="#ecfccb" stroke-width="4" fill="none"/>
  <path d="M 340 170 L 340 450" stroke="#ecfccb" stroke-width="4" fill="none"/>
  <!-- Stem -->
  <path d="M 340 170 Q 330 130 310 120" stroke="#4d7c0f" stroke-width="12" fill="none" stroke-linecap="round"/>
  <!-- Melon slice -->
  <path d="M 430 440 C 560 440 630 330 630 220 L 470 340 Z" fill="#f97316" filter="url(#shadow)"/>
  <path d="M 440 440 C 570 440 640 330 640 220" stroke="#84cc16" stroke-width="16" fill="none"/>
  <!-- Seeds on slice -->
  <ellipse cx="515" cy="335" rx="8" ry="4" fill="#fef08a" transform="rotate(-40 515 335)"/>
  <ellipse cx="535" cy="310" rx="8" ry="4" fill="#fef08a" transform="rotate(-40 535 310)"/>
  <ellipse cx="560" cy="285" rx="8" ry="4" fill="#fef08a" transform="rotate(-40 560 285)"/>
""")

# 5. ga-ri.svg
create_svg("ga-ri.svg", "Gà ri thả vườn đồi tự nhiên", 800, 600, """
  <circle cx="400" cy="300" r="220" fill="#fef3c7" opacity="0.7"/>
  <!-- Legs -->
  <line x1="370" y1="440" x2="370" y2="510" stroke="#d97706" stroke-width="8" stroke-linecap="round"/>
  <line x1="370" y1="510" x2="345" y2="525" stroke="#d97706" stroke-width="6" stroke-linecap="round"/>
  <line x1="370" y1="510" x2="395" y2="525" stroke="#d97706" stroke-width="6" stroke-linecap="round"/>
  <line x1="430" y1="440" x2="430" y2="510" stroke="#d97706" stroke-width="8" stroke-linecap="round"/>
  <line x1="430" y1="510" x2="405" y2="525" stroke="#d97706" stroke-width="6" stroke-linecap="round"/>
  <line x1="430" y1="510" x2="455" y2="525" stroke="#d97706" stroke-width="6" stroke-linecap="round"/>
  <!-- Tail feathers -->
  <path d="M 280 320 C 180 250 160 160 240 140 C 260 220 280 260 310 290 Z" fill="#1e293b"/>
  <path d="M 290 310 C 210 230 200 130 280 110 C 300 190 310 240 330 270 Z" fill="#047857"/>
  <!-- Body -->
  <ellipse cx="380" cy="340" rx="120" ry="90" fill="#b45309" filter="url(#shadow)"/>
  <!-- Wing -->
  <path d="M 330 330 C 320 400 420 420 450 350 C 440 310 380 290 330 330 Z" fill="#78350f"/>
  <!-- Neck and Head -->
  <path d="M 440 340 C 470 300 480 210 490 170 C 520 200 520 280 480 340 Z" fill="#d97706"/>
  <circle cx="500" cy="160" r="35" fill="#d97706"/>
  <!-- Comb -->
  <path d="M 480 140 C 470 100 490 90 500 110 C 510 90 530 90 530 115 C 540 105 550 120 540 140 Z" fill="#dc2626"/>
  <!-- Wattle & Beak -->
  <path d="M 525 170 C 530 200 515 210 505 195 Z" fill="#dc2626"/>
  <polygon points="530,150 570,165 530,175" fill="#f59e0b"/>
  <!-- Eye -->
  <circle cx="510" cy="150" r="6" fill="#000000"/>
  <circle cx="512" cy="148" r="2" fill="#ffffff"/>
""")

# 6. trung-ga.svg
create_svg("trung-ga.svg", "Trứng gà ta thảo mộc tươi sạch", 800, 600, """
  <circle cx="400" cy="300" r="220" fill="#fef3c7" opacity="0.6"/>
  <!-- Straw nest -->
  <ellipse cx="400" cy="380" rx="200" ry="80" fill="#d97706" opacity="0.3"/>
  <path d="M 220 370 Q 400 450 580 370 Q 400 480 220 370 Z" fill="#f59e0b"/>
  <!-- Egg 1 Left -->
  <ellipse cx="320" cy="320" rx="55" ry="75" fill="#fed7aa" transform="rotate(-25 320 320)" filter="url(#shadow)"/>
  <ellipse cx="305" cy="300" rx="14" ry="25" fill="#ffedd5" transform="rotate(-25 305 300)"/>
  <!-- Egg 2 Right -->
  <ellipse cx="480" cy="320" rx="55" ry="75" fill="#ffedd5" transform="rotate(25 480 320)" filter="url(#shadow)"/>
  <ellipse cx="495" cy="300" rx="14" ry="25" fill="#ffffff" transform="rotate(25 495 300)"/>
  <!-- Egg 3 Center Main -->
  <ellipse cx="400" cy="290" rx="65" ry="90" fill="#fdba74" filter="url(#shadow)"/>
  <ellipse cx="380" cy="260" rx="18" ry="30" fill="#fed7aa"/>
  <circle cx="375" cy="250" r="6" fill="#ffffff" opacity="0.8"/>
  <!-- Green herb sprig -->
  <path d="M 360 410 Q 420 390 480 430" stroke="#16a34a" stroke-width="6" fill="none" stroke-linecap="round"/>
  <ellipse cx="410" cy="395" rx="14" ry="7" fill="#22c55e" transform="rotate(-20 410 395)"/>
  <ellipse cx="450" cy="405" rx="14" ry="7" fill="#22c55e" transform="rotate(30 450 405)"/>
""")

# 7. ca-ro-phi.svg
create_svg("ca-ro-phi.svg", "Cá rô phi sông sinh thái tự nhiên", 800, 600, """
  <rect width="800" height="600" fill="#e0f2fe" rx="24"/>
  <circle cx="400" cy="300" r="220" fill="#bae6fd" opacity="0.5"/>
  <!-- Water bubbles -->
  <circle cx="240" cy="220" r="14" fill="#ffffff" opacity="0.6"/>
  <circle cx="210" cy="180" r="8" fill="#ffffff" opacity="0.6"/>
  <circle cx="270" cy="150" r="20" fill="#ffffff" opacity="0.6"/>
  <!-- Tail fin -->
  <path d="M 520 300 L 610 220 C 580 300 580 300 610 380 Z" fill="#64748b" filter="url(#shadow)"/>
  <!-- Dorsal fin -->
  <path d="M 330 220 Q 440 180 500 240 L 490 260 Z" fill="#475569"/>
  <!-- Ventral fin -->
  <path d="M 370 375 L 430 420 L 440 370 Z" fill="#64748b"/>
  <!-- Fish Body -->
  <ellipse cx="390" cy="300" rx="150" ry="85" fill="#94a3b8" filter="url(#shadow)"/>
  <path d="M 260 300 Q 390 390 520 300 Q 390 370 260 300 Z" fill="#cbd5e1"/>
  <!-- Fish Head & Eye -->
  <circle cx="310" cy="285" r="12" fill="#ffffff"/>
  <circle cx="308" cy="285" r="7" fill="#0f172a"/>
  <!-- Gill line -->
  <path d="M 345 250 Q 360 300 345 350" stroke="#475569" stroke-width="5" fill="none" stroke-linecap="round"/>
  <!-- Pectoral fin -->
  <path d="M 370 300 Q 420 320 400 345 Z" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/>
  <!-- Scales accent -->
  <path d="M 410 270 Q 425 285 410 300" stroke="#64748b" stroke-width="3" fill="none"/>
  <path d="M 440 280 Q 455 295 440 310" stroke="#64748b" stroke-width="3" fill="none"/>
""")

# 8. ao-ca.svg
create_svg("ao-ca.svg", "Ao cá sinh thái tuần hoàn nước", 800, 600, """
  <!-- Sky -->
  <rect y="0" width="800" height="300" fill="url(#skyGrad)"/>
  <!-- Sun -->
  <circle cx="160" cy="120" r="50" fill="#fef08a"/>
  <!-- Distant hills -->
  <path d="M 0 300 Q 200 180 450 250 Q 650 190 800 270 L 800 300 Z" fill="#86efac"/>
  <!-- Pond banks -->
  <ellipse cx="400" cy="430" rx="350" ry="140" fill="#ca8a04"/>
  <!-- Pond water -->
  <ellipse cx="400" cy="425" rx="330" ry="120" fill="#0284c7" filter="url(#shadow)"/>
  <ellipse cx="400" cy="420" rx="300" ry="100" fill="#38bdf8" opacity="0.6"/>
  <!-- Water ripples -->
  <ellipse cx="360" cy="410" rx="80" ry="20" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.7"/>
  <ellipse cx="460" cy="440" rx="100" ry="25" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.7"/>
  <!-- Aerator paddlewheel -->
  <rect x="250" y="380" width="60" height="20" rx="6" fill="#e2e8f0"/>
  <circle cx="280" cy="390" r="25" fill="none" stroke="#0284c7" stroke-width="6" stroke-dasharray="10 6"/>
  <!-- Water splash -->
  <path d="M 260 380 Q 250 350 270 370 Q 280 340 290 370 Q 310 350 300 380 Z" fill="#ffffff" opacity="0.8"/>
  <!-- Coconut / green trees -->
  <path d="M 660 320 Q 670 250 680 180" stroke="#78350f" stroke-width="10" stroke-linecap="round"/>
  <circle cx="680" cy="170" r="45" fill="#15803d"/>
""")

# 9. nha-kinh.svg
create_svg("nha-kinh.svg", "Nhà kính nông nghiệp thông minh công nghệ cao", 800, 600, """
  <!-- Sky -->
  <rect y="0" width="800" height="350" fill="url(#skyGrad)"/>
  <!-- Ground -->
  <rect y="350" width="800" height="250" fill="#86efac"/>
  <!-- Greenhouse Main Frame -->
  <path d="M 150 450 L 150 260 L 400 130 L 650 260 L 650 450 Z" fill="#ffffff" opacity="0.85" stroke="#0284c7" stroke-width="8" filter="url(#shadow)"/>
  <!-- Roof rafters -->
  <line x1="400" y1="130" x2="400" y2="450" stroke="#0284c7" stroke-width="6"/>
  <line x1="275" y1="195" x2="275" y2="450" stroke="#38bdf8" stroke-width="4"/>
  <line x1="525" y1="195" x2="525" y2="450" stroke="#38bdf8" stroke-width="4"/>
  <line x1="150" y1="260" x2="650" y2="260" stroke="#0284c7" stroke-width="6"/>
  <line x1="150" y1="350" x2="650" y2="350" stroke="#38bdf8" stroke-width="4"/>
  <!-- Glass reflection glares -->
  <polygon points="200,280 250,280 220,340 170,340" fill="#e0f2fe" opacity="0.6"/>
  <polygon points="320,200 370,200 340,250 290,250" fill="#e0f2fe" opacity="0.6"/>
  <!-- High tech crops inside -->
  <rect x="200" y="400" width="50" height="40" fill="#22c55e" rx="10"/>
  <rect x="320" y="400" width="50" height="40" fill="#22c55e" rx="10"/>
  <rect x="440" y="400" width="50" height="40" fill="#22c55e" rx="10"/>
  <rect x="560" y="400" width="50" height="40" fill="#22c55e" rx="10"/>
  <!-- Solar panel on roof -->
  <rect x="350" y="100" width="100" height="25" fill="#1e3a8a" stroke="#60a5fa" stroke-width="3" rx="4"/>
""")

# 10. canh-dong.svg
create_svg("canh-dong.svg", "Cánh đồng rau hữu cơ bạt ngàn", 800, 600, """
  <rect width="800" height="300" fill="url(#skyGrad)"/>
  <!-- Clouds -->
  <circle cx="220" cy="100" r="40" fill="#ffffff" opacity="0.8"/>
  <circle cx="260" cy="90" r="50" fill="#ffffff" opacity="0.8"/>
  <circle cx="300" cy="100" r="40" fill="#ffffff" opacity="0.8"/>
  <!-- Far mountain -->
  <polygon points="400,300 550,160 700,300" fill="#93c5fd"/>
  <polygon points="200,300 350,180 500,300" fill="#bfdbfe"/>
  <!-- Field perspective strips -->
  <polygon points="0,300 800,300 800,600 0,600" fill="#15803d"/>
  <polygon points="400,300 440,300 540,600 460,600" fill="#22c55e"/>
  <polygon points="480,300 520,300 720,600 620,600" fill="#16a34a"/>
  <polygon points="320,300 360,300 260,600 180,600" fill="#22c55e"/>
  <polygon points="240,300 280,300 80,600 -20,600" fill="#16a34a"/>
  <!-- Small tractor in distance -->
  <rect x="460" y="340" width="40" height="25" fill="#ef4444" rx="4"/>
  <circle cx="470" cy="365" r="8" fill="#1e293b"/>
  <circle cx="495" cy="365" r="10" fill="#1e293b"/>
""")

# 11. tour-thu-hoach.svg
create_svg("tour-thu-hoach.svg", "Tour trải nghiệm thu hoạch nông sản sạch", 800, 600, """
  <circle cx="400" cy="300" r="230" fill="#dcfce7" opacity="0.7"/>
  <!-- Woven basket -->
  <ellipse cx="400" cy="460" rx="160" ry="40" fill="#78350f" opacity="0.3"/>
  <path d="M 260 360 L 290 480 C 340 510 460 510 510 480 L 540 360 Z" fill="#d97706" filter="url(#shadow)"/>
  <!-- Basket weave lines -->
  <path d="M 280 420 Q 400 450 520 420" stroke="#b45309" stroke-width="6" fill="none"/>
  <path d="M 290 460 Q 400 490 510 460" stroke="#b45309" stroke-width="6" fill="none"/>
  <line x1="340" y1="370" x2="350" y2="495" stroke="#b45309" stroke-width="4"/>
  <line x1="400" y1="370" x2="400" y2="505" stroke="#b45309" stroke-width="4"/>
  <line x1="460" y1="370" x2="450" y2="495" stroke="#b45309" stroke-width="4"/>
  <!-- Vegetables inside basket -->
  <circle cx="340" cy="340" r="50" fill="#ef4444"/> <!-- Tomato -->
  <circle cx="440" cy="330" r="55" fill="#f97316"/> <!-- Orange carrot / squash -->
  <!-- Carrots sticking out -->
  <polygon points="460,330 520,240 480,220" fill="#ea580c"/>
  <path d="M 500 230 Q 530 180 560 190" stroke="#16a34a" stroke-width="6" fill="none"/>
  <!-- Leafy greens sticking out -->
  <path d="M 360 330 C 320 250 350 180 400 170 C 420 240 400 310 370 330 Z" fill="#22c55e"/>
  <!-- Farmer conical hat (Nón lá) -->
  <polygon points="220,280 320,180 420,280" fill="#fef08a" stroke="#ca8a04" stroke-width="4" filter="url(#shadow)"/>
""")

# 12. cau-ca.svg
create_svg("cau-ca.svg", "Tour câu cá thư giãn bên hồ sinh thái", 800, 600, """
  <rect width="800" height="320" fill="url(#skyGrad)"/>
  <rect y="320" width="800" height="280" fill="#0284c7"/>
  <!-- Wooden dock / pier -->
  <polygon points="0,380 280,360 280,420 0,460" fill="#78350f" filter="url(#shadow)"/>
  <polygon points="0,380 280,360 300,380 0,400" fill="#a16207"/>
  <!-- Dock pilings -->
  <rect x="250" y="380" width="20" height="120" fill="#451a03"/>
  <!-- Fishing rod -->
  <line x1="180" y1="370" x2="520" y2="180" stroke="#334155" stroke-width="6" stroke-linecap="round"/>
  <!-- Fishing line -->
  <path d="M 520 180 Q 560 260 560 380" stroke="#ffffff" stroke-width="2" fill="none" stroke-dasharray="6 3"/>
  <!-- Bobber / Float -->
  <ellipse cx="560" cy="380" rx="8" ry="14" fill="#ef4444"/>
  <ellipse cx="560" cy="390" rx="8" ry="8" fill="#ffffff"/>
  <!-- Jumping fish -->
  <path d="M 640 330 Q 610 260 650 230 Q 690 280 670 340 Z" fill="#38bdf8" filter="url(#shadow)"/>
  <!-- Water ripples -->
  <ellipse cx="560" cy="395" rx="30" ry="8" stroke="#bae6fd" stroke-width="3" fill="none"/>
  <ellipse cx="650" cy="350" rx="40" ry="10" stroke="#bae6fd" stroke-width="3" fill="none"/>
""")

# 13. cho-ga-an.svg
create_svg("cho-ga-an.svg", "Trải nghiệm cho gà ăn & nhặt trứng cho gia đình", 800, 600, """
  <circle cx="400" cy="300" r="230" fill="#fef3c7" opacity="0.6"/>
  <!-- Grain bowl / bucket -->
  <path d="M 200 380 L 220 490 C 260 510 340 510 380 490 L 400 380 Z" fill="#0284c7" filter="url(#shadow)"/>
  <ellipse cx="300" cy="380" rx="100" ry="25" fill="#fef08a"/>
  <!-- Scattered grains -->
  <circle cx="340" cy="460" r="4" fill="#d97706"/>
  <circle cx="370" cy="480" r="4" fill="#d97706"/>
  <circle cx="420" cy="450" r="5" fill="#d97706"/>
  <circle cx="450" cy="470" r="4" fill="#d97706"/>
  <circle cx="480" cy="440" r="5" fill="#d97706"/>
  <!-- Happy chicken pecking -->
  <ellipse cx="540" cy="420" rx="70" ry="50" fill="#b45309" filter="url(#shadow)"/>
  <path d="M 500 420 L 440 450 L 470 410 Z" fill="#d97706"/>
  <polygon points="440,450 410,460 435,440" fill="#f59e0b"/>
  <path d="M 570 390 C 620 370 630 330 590 350 Z" fill="#1e293b"/>
  <!-- Little chick -->
  <circle cx="490" cy="480" r="20" fill="#fde047"/>
  <circle cx="475" cy="475" r="14" fill="#fde047"/>
  <polygon points="465,475 450,480 465,485" fill="#f97316"/>
  <circle cx="472" cy="472" r="3" fill="#000000"/>
""")

# 14. may-bom.svg
create_svg("may-bom.svg", "Hệ thống máy bơm tưới tự động tiết kiệm nước", 800, 600, """
  <circle cx="400" cy="300" r="220" fill="#e0f2fe" opacity="0.6"/>
  <!-- Concrete Base -->
  <rect x="220" y="440" width="360" height="60" fill="#64748b" rx="10" filter="url(#shadow)"/>
  <!-- Motor Cylinder -->
  <rect x="260" y="270" width="180" height="170" fill="#0284c7" rx="20" filter="url(#shadow)"/>
  <!-- Motor cooling fins -->
  <line x1="290" y1="270" x2="290" y2="440" stroke="#0369a1" stroke-width="8"/>
  <line x1="330" y1="270" x2="330" y2="440" stroke="#0369a1" stroke-width="8"/>
  <line x1="370" y1="270" x2="370" y2="440" stroke="#0369a1" stroke-width="8"/>
  <line x1="410" y1="270" x2="410" y2="440" stroke="#0369a1" stroke-width="8"/>
  <!-- Pump Impeller Volute -->
  <circle cx="490" cy="355" r="75" fill="#0f766e" filter="url(#shadow)"/>
  <!-- Outflow Pipe Up -->
  <rect x="465" y="160" width="50" height="130" fill="#0d9488"/>
  <rect x="450" y="150" width="80" height="20" fill="#115e59" rx="4"/>
  <!-- Pressure Gauge -->
  <circle cx="560" cy="210" r="30" fill="#ffffff" stroke="#334155" stroke-width="6"/>
  <line x1="560" y1="210" x2="575" y2="195" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/>
  <!-- Connecting pipe to gauge -->
  <line x1="515" y1="210" x2="530" y2="210" stroke="#0d9488" stroke-width="12"/>
""")

# 15. cam-bien.svg
create_svg("cam-bien.svg", "Cảm biến thông minh IoT đo độ ẩm nhiệt độ đất", 800, 600, """
  <circle cx="400" cy="300" r="220" fill="#f0fdf4" opacity="0.8"/>
  <!-- Soil layer -->
  <rect x="180" y="420" width="440" height="100" fill="#78350f" rx="16"/>
  <path d="M 180 420 Q 300 410 400 420 Q 500 430 620 420 L 620 440 L 180 440 Z" fill="#15803d"/>
  <!-- Sensor Steel Probes in Soil -->
  <rect x="360" y="380" width="16" height="110" fill="#94a3b8" rx="6"/>
  <rect x="424" y="380" width="16" height="110" fill="#94a3b8" rx="6"/>
  <!-- Main Sensor Module Case -->
  <rect x="320" y="200" width="160" height="190" fill="#0f172a" rx="20" filter="url(#shadow)"/>
  <!-- LCD Display Screen -->
  <rect x="345" y="230" width="110" height="70" fill="#064e3b" rx="8"/>
  <!-- Digital Text Glyphs -->
  <text x="360" y="260" fill="#34d399" font-family="monospace" font-size="20" font-weight="bold">28.5°C</text>
  <text x="360" y="285" fill="#38bdf8" font-family="monospace" font-size="18">68% RH</text>
  <!-- Status LED -->
  <circle cx="360" cy="350" r="8" fill="#22c55e"/>
  <circle cx="400" cy="350" r="8" fill="#3b82f6"/>
  <!-- Wireless Antenna -->
  <line x1="400" y1="200" x2="400" y2="120" stroke="#475569" stroke-width="8" stroke-linecap="round"/>
  <circle cx="400" cy="115" r="10" fill="#0284c7"/>
  <!-- Wireless Radio Waves -->
  <path d="M 370 95 A 40 40 0 0 1 430 95" stroke="#0284c7" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M 350 75 A 70 70 0 0 1 450 75" stroke="#0284c7" stroke-width="4" fill="none" stroke-linecap="round"/>
""")

# 16. kho-hang.svg
create_svg("kho-hang.svg", "Kho bảo quản nông sản và trung tâm logistics XFarm", 800, 600, """
  <rect width="800" height="300" fill="url(#skyGrad)"/>
  <rect y="300" width="800" height="300" fill="#cbd5e1"/>
  <!-- Warehouse Building Structure -->
  <polygon points="120,480 120,240 400,140 680,240 680,480" fill="#f8fafc" stroke="#475569" stroke-width="8" filter="url(#shadow)"/>
  <!-- Rolling Shutter Door -->
  <rect x="280" y="280" width="240" height="200" fill="#94a3b8"/>
  <!-- Shutter horizontal slats -->
  <line x1="280" y1="320" x2="520" y2="320" stroke="#64748b" stroke-width="4"/>
  <line x1="280" y1="360" x2="520" y2="360" stroke="#64748b" stroke-width="4"/>
  <line x1="280" y1="400" x2="520" y2="400" stroke="#64748b" stroke-width="4"/>
  <line x1="280" y1="440" x2="520" y2="440" stroke="#64748b" stroke-width="4"/>
  <!-- Wooden crates stacked outside -->
  <rect x="560" y="420" width="70" height="60" fill="#d97706" rx="4"/>
  <rect x="575" y="360" width="70" height="60" fill="#b45309" rx="4"/>
  <!-- Green leaf logo on warehouse facade -->
  <circle cx="400" cy="210" r="35" fill="#dcfce7"/>
  <path d="M 385 225 C 385 195 415 195 415 225 Z" fill="#16a34a"/>
""")

# 17. banner-1.svg (16:9 ratio: 1600x900)
create_svg("banner-1.svg", "Banner nông nghiệp sinh thái tuần hoàn bền vững", 1600, 900, """
  <!-- Sky with golden sunrise -->
  <defs>
    <linearGradient id="b1Sky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="60%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#fef08a"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="500" fill="url(#b1Sky)"/>
  <circle cx="300" cy="350" r="140" fill="#fde047" opacity="0.9"/>
  <!-- Distant mountain ridges -->
  <path d="M 0 500 Q 400 320 800 420 Q 1200 300 1600 460 L 1600 500 Z" fill="#047857" opacity="0.7"/>
  <!-- Lush agricultural fields -->
  <path d="M 0 500 Q 500 440 1000 520 Q 1300 470 1600 530 L 1600 900 L 0 900 Z" fill="#065f46"/>
  <polygon points="200,900 600,520 800,520 500,900" fill="#059669"/>
  <polygon points="600,900 900,520 1100,520 900,900" fill="#10b981"/>
  <polygon points="1000,900 1200,520 1400,520 1350,900" fill="#34d399"/>
  <!-- Modern greenhouse silhouette -->
  <polygon points="1200,520 1280,470 1360,520" fill="#ffffff" opacity="0.8"/>
  <rect x="1200" y="520" width="160" height="60" fill="#ffffff" opacity="0.8"/>
  <!-- Big decorative emblem / leaf circle -->
  <circle cx="1350" cy="250" r="120" fill="#ffffff" opacity="0.15"/>
""")

# 18. banner-2.svg (16:9 ratio: 1600x900)
create_svg("banner-2.svg", "Banner nông sản tươi lành an tâm mỗi ngày", 1600, 900, """
  <defs>
    <linearGradient id="b2Bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#064e3b"/>
      <stop offset="50%" stop-color="#047857"/>
      <stop offset="100%" stop-color="#0f766e"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#b2Bg)"/>
  <!-- Abstract organic circles -->
  <circle cx="1400" cy="300" r="350" fill="#10b981" opacity="0.15"/>
  <circle cx="200" cy="700" r="300" fill="#34d399" opacity="0.1"/>
  <!-- Giant Fresh Harvest Basket on right -->
  <ellipse cx="1200" cy="750" rx="300" ry="80" fill="#000000" opacity="0.2"/>
  <path d="M 950 560 L 1000 780 C 1100 830 1300 830 1400 780 L 1450 560 Z" fill="#d97706" filter="url(#shadow)"/>
  <!-- Vegetables overflowing -->
  <circle cx="1080" cy="520" r="90" fill="#ef4444"/> <!-- Tomato -->
  <circle cx="1250" cy="500" r="110" fill="#84cc16"/> <!-- Melon -->
  <ellipse cx="1180" cy="420" rx="90" ry="140" fill="#22c55e" transform="rotate(-15 1180 420)"/> <!-- Lettuce -->
  <circle cx="1350" cy="550" r="75" fill="#f97316"/> <!-- Carrot / citrus -->
  <!-- Floating leaf accents -->
  <path d="M 400 250 C 450 180 550 200 530 280 C 470 300 420 280 400 250 Z" fill="#4ade80" opacity="0.4"/>
  <path d="M 650 350 C 700 280 800 300 780 380 C 720 400 670 380 650 350 Z" fill="#86efac" opacity="0.3"/>
""")

# 19. banner-3.svg (16:9 ratio: 1600x900)
create_svg("banner-3.svg", "Banner tour trải nghiệm du lịch nông trại sinh thái", 1600, 900, """
  <defs>
    <linearGradient id="b3Bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="60%" stop-color="#4338ca"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#b3Bg)"/>
  <!-- Sunset glow -->
  <circle cx="800" cy="650" r="220" fill="#fbbf24" opacity="0.8"/>
  <!-- Hills and pine trees of Da Lat -->
  <path d="M 0 900 L 0 720 Q 300 620 600 700 Q 1000 580 1600 740 L 1600 900 Z" fill="#064e3b"/>
  <path d="M 0 900 L 0 780 Q 500 700 900 780 Q 1300 720 1600 800 L 1600 900 Z" fill="#022c22"/>
  <!-- Pine trees silhouettes -->
  <polygon points="300,720 320,640 340,720" fill="#022c22"/>
  <polygon points="360,740 385,650 410,740" fill="#022c22"/>
  <polygon points="1200,750 1225,660 1250,750" fill="#022c22"/>
  <polygon points="1270,760 1290,680 1310,760" fill="#022c22"/>
  <!-- Camping Tent -->
  <polygon points="720,850 800,730 880,850" fill="#f97316"/>
  <polygon points="800,730 880,850 820,850" fill="#c2410c"/>
  <!-- Campfire -->
  <polygon points="940,850 955,815 970,850" fill="#ef4444"/>
  <polygon points="950,850 958,825 965,850" fill="#fef08a"/>
  <!-- Stars in sky -->
  <circle cx="200" cy="200" r="3" fill="#ffffff"/>
  <circle cx="350" cy="140" r="4" fill="#ffffff"/>
  <circle cx="500" cy="250" r="2" fill="#ffffff"/>
  <circle cx="1100" cy="180" r="3" fill="#ffffff"/>
  <circle cx="1300" cy="120" r="4" fill="#ffffff"/>
  <circle cx="1450" cy="220" r="2" fill="#ffffff"/>
""")

# 20. dua-leo.svg
create_svg("dua-leo.svg", "Dưa leo baby giòn ngọt", 800, 600, """
  <circle cx="400" cy="300" r="220" fill="#ecfccb" opacity="0.6"/>
  <!-- Cucumber 1 -->
  <path d="M 280 430 C 220 350 260 210 360 180 C 410 170 430 200 410 260 C 370 360 360 450 280 430 Z" fill="#22c55e" filter="url(#shadow)"/>
  <path d="M 330 240 Q 300 320 310 400" stroke="#86efac" stroke-width="6" stroke-linecap="round" fill="none"/>
  <!-- Cucumber 2 -->
  <path d="M 380 440 C 460 450 550 360 520 250 C 500 190 460 200 440 250 C 420 310 420 390 380 440 Z" fill="#16a34a" filter="url(#shadow)"/>
  <!-- Yellow flower -->
  <circle cx="525" cy="235" r="10" fill="#fde047"/>
  <polygon points="525,220 535,235 525,250 515,235" fill="#facc15"/>
""")

# 21. ot-chuong.svg
create_svg("ot-chuong.svg", "Ớt chuông ngọt tươi giòn Đà Lạt", 800, 600, """
  <circle cx="400" cy="300" r="220" fill="#fee2e2" opacity="0.6"/>
  <!-- Red bell pepper lobes -->
  <ellipse cx="340" cy="360" rx="50" ry="90" fill="#dc2626" filter="url(#shadow)"/>
  <ellipse cx="460" cy="360" rx="50" ry="90" fill="#dc2626" filter="url(#shadow)"/>
  <ellipse cx="400" cy="370" rx="60" ry="95" fill="#ef4444" filter="url(#shadow)"/>
  <!-- Highlights -->
  <ellipse cx="380" cy="320" rx="15" ry="35" fill="#f87171"/>
  <!-- Green stem -->
  <path d="M 400 270 Q 390 190 430 180" stroke="#16a34a" stroke-width="18" fill="none" stroke-linecap="round"/>
""")

# 22. bap-cai.svg
create_svg("bap-cai.svg", "Bắp cải hữu cơ cuộn chặt tự nhiên", 800, 600, """
  <circle cx="400" cy="300" r="220" fill="#dcfce7" opacity="0.6"/>
  <!-- Big spherical cabbage -->
  <circle cx="400" cy="320" r="140" fill="#4ade80" filter="url(#shadow)"/>
  <!-- Overlapping outer leaves -->
  <path d="M 270 330 C 270 230 380 200 440 250 C 370 280 320 360 350 440 C 290 420 270 380 270 330 Z" fill="#22c55e"/>
  <path d="M 530 330 C 530 230 420 200 360 250 C 430 280 480 360 450 440 C 510 420 530 380 530 330 Z" fill="#16a34a"/>
  <!-- White leaf veins -->
  <path d="M 400 320 Q 340 300 310 260" stroke="#f0fdf4" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M 400 320 Q 460 300 490 260" stroke="#f0fdf4" stroke-width="6" fill="none" stroke-linecap="round"/>
""")

# 23. ca-tim.svg
create_svg("ca-tim.svg", "Cà tím sinh thái quả dài bóng mượt", 800, 600, """
  <circle cx="400" cy="300" r="220" fill="#f3e8ff" opacity="0.6"/>
  <!-- Eggplant body -->
  <path d="M 350 230 C 310 320 330 450 420 460 C 480 460 500 400 460 320 C 430 270 410 240 370 220 Z" fill="#581c87" filter="url(#shadow)"/>
  <!-- Glare -->
  <path d="M 380 300 Q 360 380 410 430" stroke="#c084fc" stroke-width="12" stroke-linecap="round" fill="none"/>
  <!-- Green Calyx -->
  <polygon points="345,230 375,190 395,235 410,195 380,245 350,250" fill="#15803d"/>
  <path d="M 385 200 Q 400 150 430 140" stroke="#16a34a" stroke-width="12" fill="none" stroke-linecap="round"/>
""")

# 24. vit-co.svg
create_svg("vit-co.svg", "Đàn vịt cỏ sinh thái thả cánh đồng", 800, 600, """
  <rect width="800" height="350" fill="url(#skyGrad)"/>
  <rect y="350" width="800" height="250" fill="#38bdf8"/>
  <!-- Duck body -->
  <ellipse cx="400" cy="400" rx="110" ry="70" fill="#f8fafc" filter="url(#shadow)"/>
  <!-- Wing -->
  <path d="M 370 380 C 440 370 480 410 420 440 Z" fill="#cbd5e1"/>
  <!-- Duck head -->
  <circle cx="480" cy="310" r="35" fill="#065f46"/> <!-- Mallard green head -->
  <ellipse cx="460" cy="350" rx="25" ry="40" fill="#f8fafc"/>
  <!-- Bill -->
  <polygon points="510,310 560,325 510,335" fill="#f59e0b"/>
  <!-- Eye -->
  <circle cx="490" cy="305" r="5" fill="#000000"/>
  <!-- Water ripple -->
  <ellipse cx="400" cy="470" rx="150" ry="18" stroke="#ffffff" stroke-width="3" fill="none"/>
""")

# 25. ca-dieu-hong.svg
create_svg("ca-dieu-hong.svg", "Cá diêu hồng tươi sống nuôi lồng bè tự nhiên", 800, 600, """
  <rect width="800" height="600" fill="#e0f2fe" rx="24"/>
  <circle cx="400" cy="300" r="220" fill="#bae6fd" opacity="0.6"/>
  <!-- Tail fin -->
  <path d="M 520 300 L 610 220 C 580 300 580 300 610 380 Z" fill="#fb7185" filter="url(#shadow)"/>
  <!-- Fish Body Pinkish Red -->
  <ellipse cx="390" cy="300" rx="150" ry="85" fill="#f43f5e" filter="url(#shadow)"/>
  <path d="M 260 300 Q 390 390 520 300 Q 390 370 260 300 Z" fill="#fda4af"/>
  <!-- Fins -->
  <path d="M 330 220 Q 440 180 500 240 L 490 260 Z" fill="#e11d48"/>
  <path d="M 370 375 L 430 420 L 440 370 Z" fill="#fb7185"/>
  <!-- Eye -->
  <circle cx="310" cy="285" r="12" fill="#ffffff"/>
  <circle cx="308" cy="285" r="7" fill="#0f172a"/>
""")

# 26. phan-huu-co.svg
create_svg("phan-huu-co.svg", "Phân bón vi sinh hữu cơ ủ hoai mục cao cấp", 800, 600, """
  <circle cx="400" cy="300" r="220" fill="#fef3c7" opacity="0.6"/>
  <!-- Fertilizer sack -->
  <path d="M 280 200 L 520 200 L 500 500 L 300 500 Z" fill="#a16207" filter="url(#shadow)" rx="10"/>
  <!-- Top cinch -->
  <polygon points="260,180 540,180 510,210 290,210" fill="#78350f"/>
  <line x1="260" y1="200" x2="540" y2="200" stroke="#fef08a" stroke-width="4"/>
  <!-- Emblem on sack -->
  <circle cx="400" cy="350" r="60" fill="#fef9c3"/>
  <!-- Plant sprout icon -->
  <path d="M 400 380 L 400 320" stroke="#15803d" stroke-width="8" stroke-linecap="round"/>
  <path d="M 400 340 C 370 320 370 290 400 300" fill="#22c55e"/>
  <path d="M 400 330 C 430 310 430 280 400 290" fill="#16a34a"/>
  <!-- Text BIO -->
  <text x="400" y="440" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="28" fill="#ffffff">ORGANIC</text>
""")

# 27. thuc-an-chan-nuoi.svg
create_svg("thuc-an-chan-nuoi.svg", "Cám sinh học cao cấp cho gia súc gia cầm", 800, 600, """
  <circle cx="400" cy="300" r="220" fill="#ecfccb" opacity="0.6"/>
  <!-- Feed Sack -->
  <path d="M 270 220 L 530 220 L 510 510 L 290 510 Z" fill="#047857" filter="url(#shadow)"/>
  <!-- Bag seam -->
  <rect x="250" y="195" width="300" height="30" fill="#065f46" rx="6"/>
  <!-- Golden grain circle -->
  <circle cx="400" cy="360" r="65" fill="#fef08a"/>
  <!-- Wheat ear icon -->
  <line x1="400" y1="390" x2="400" y2="330" stroke="#d97706" stroke-width="6"/>
  <ellipse cx="390" cy="340" rx="10" ry="5" fill="#f59e0b" transform="rotate(-30 390 340)"/>
  <ellipse cx="410" cy="340" rx="10" ry="5" fill="#f59e0b" transform="rotate(30 410 340)"/>
  <ellipse cx="390" cy="360" rx="10" ry="5" fill="#f59e0b" transform="rotate(-30 390 360)"/>
  <ellipse cx="410" cy="360" rx="10" ry="5" fill="#f59e0b" transform="rotate(30 410 360)"/>
  <text x="400" y="460" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="24" fill="#ffffff">FEED 100%</text>
""")

# 28. chuong-nuoi.svg
create_svg("chuong-nuoi.svg", "Chuồng nuôi gia cầm thoáng khí đệm lót sinh học", 800, 600, """
  <rect width="800" height="320" fill="url(#skyGrad)"/>
  <rect y="320" width="800" height="280" fill="#86efac"/>
  <!-- Barn roof -->
  <polygon points="150,300 400,160 650,300" fill="#dc2626" filter="url(#shadow)"/>
  <!-- Barn walls -->
  <rect x="180" y="300" width="440" height="180" fill="#ffffff" stroke="#94a3b8" stroke-width="4"/>
  <!-- Wire mesh ventilation opening -->
  <rect x="220" y="330" width="360" height="60" fill="#f1f5f9" stroke="#64748b" stroke-width="3"/>
  <line x1="260" y1="330" x2="260" y2="390" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="320" y1="330" x2="320" y2="390" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="380" y1="330" x2="380" y2="390" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="440" y1="330" x2="440" y2="390" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="500" y1="330" x2="500" y2="390" stroke="#cbd5e1" stroke-width="2"/>
  <!-- Barn doors -->
  <rect x="340" y="390" width="120" height="90" fill="#78350f"/>
""")

# 29. tour-cam-trai.svg
create_svg("tour-cam-trai.svg", "Tour cắm trại dã ngoại picnic nông trại", 800, 600, """
  <defs>
    <linearGradient id="duskGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#312e81"/>
      <stop offset="60%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#fb923c"/>
    </linearGradient>
  </defs>
  <rect width="800" height="400" fill="url(#duskGrad)"/>
  <rect y="400" width="800" height="200" fill="#064e3b"/>
  <!-- Crescent moon -->
  <circle cx="650" cy="120" r="35" fill="#fef08a"/>
  <circle cx="665" cy="110" r="32" fill="#312e81"/>
  <!-- Camping Tent -->
  <polygon points="250,520 400,340 550,520" fill="#ea580c" filter="url(#shadow)"/>
  <polygon points="400,340 550,520 450,520" fill="#c2410c"/>
  <polygon points="340,520 400,430 460,520" fill="#1e1b4b"/>
  <!-- Campfire -->
  <ellipse cx="620" cy="520" rx="30" ry="10" fill="#451a03"/>
  <polygon points="605,520 620,460 635,520" fill="#ef4444"/>
  <polygon points="612,520 620,480 628,520" fill="#fde047"/>
""")

# 30. tour-lop-hoc-xanh.svg
create_svg("tour-lop-hoc-xanh.svg", "Lớp học thiên nhiên và nông nghiệp xanh cho bé", 800, 600, """
  <circle cx="400" cy="300" r="230" fill="#dcfce7" opacity="0.6"/>
  <!-- Blackboard on easel -->
  <line x1="280" y1="200" x2="250" y2="480" stroke="#78350f" stroke-width="8" stroke-linecap="round"/>
  <line x1="520" y1="200" x2="550" y2="480" stroke="#78350f" stroke-width="8" stroke-linecap="round"/>
  <line x1="400" y1="200" x2="400" y2="480" stroke="#78350f" stroke-width="6"/>
  <rect x="250" y="200" width="300" height="200" fill="#064e3b" rx="10" stroke="#b45309" stroke-width="8" filter="url(#shadow)"/>
  <!-- Chalk drawing on board -->
  <circle cx="400" cy="270" r="30" fill="none" stroke="#ffffff" stroke-width="4"/>
  <path d="M 400 300 L 400 350" stroke="#ffffff" stroke-width="4"/>
  <path d="M 400 320 Q 370 310 380 330" stroke="#ffffff" stroke-width="3" fill="none"/>
  <path d="M 400 330 Q 430 320 420 340" stroke="#ffffff" stroke-width="3" fill="none"/>
  <!-- Little seedling pot on ground -->
  <path d="M 360 480 L 440 480 L 430 530 L 370 530 Z" fill="#ea580c"/>
  <path d="M 400 480 Q 400 450 420 450" stroke="#22c55e" stroke-width="6" fill="none"/>
""")

# 31. may-suc-khi.svg
create_svg("may-suc-khi.svg", "Máy sục khí nano khuếch tán oxy ao cá", 800, 600, """
  <rect width="800" height="350" fill="url(#skyGrad)"/>
  <rect y="350" width="800" height="250" fill="#0284c7"/>
  <!-- Floating floats (phao nổi) -->
  <rect x="200" y="380" width="400" height="35" rx="16" fill="#eab308" filter="url(#shadow)"/>
  <!-- Electric motor -->
  <rect x="360" y="310" width="80" height="75" fill="#334155" rx="10"/>
  <!-- Paddlewheel shafts and spinning blades -->
  <circle cx="280" cy="390" r="45" fill="none" stroke="#ffffff" stroke-width="8" stroke-dasharray="14 10"/>
  <circle cx="520" cy="390" r="45" fill="none" stroke="#ffffff" stroke-width="8" stroke-dasharray="14 10"/>
  <!-- Frothing water spray -->
  <path d="M 230 370 Q 280 320 330 380 Z" fill="#ffffff" opacity="0.8"/>
  <path d="M 470 370 Q 520 320 570 380 Z" fill="#ffffff" opacity="0.8"/>
""")

# 32. trung-vit.svg
create_svg("trung-vit.svg", "Trứng vịt sạch vỏ trắng tự nhiên", 800, 600, """
  <circle cx="400" cy="300" r="220" fill="#e0f2fe" opacity="0.5"/>
  <!-- Bamboo plate -->
  <ellipse cx="400" cy="380" rx="180" ry="70" fill="#ca8a04"/>
  <ellipse cx="400" cy="375" rx="165" ry="58" fill="#eab308"/>
  <!-- 3 Duck eggs (white, elongated) -->
  <ellipse cx="340" cy="340" rx="50" ry="70" fill="#f8fafc" transform="rotate(-15 340 340)" filter="url(#shadow)"/>
  <ellipse cx="330" cy="320" rx="12" ry="25" fill="#ffffff" transform="rotate(-15 330 320)"/>
  <ellipse cx="460" cy="340" rx="50" ry="70" fill="#f1f5f9" transform="rotate(20 460 340)" filter="url(#shadow)"/>
  <ellipse cx="470" cy="320" rx="12" ry="25" fill="#ffffff" transform="rotate(20 470 320)"/>
  <ellipse cx="400" cy="320" rx="52" ry="72" fill="#ffffff" filter="url(#shadow)"/>
""")

print("Successfully generated all 32 SVG illustrations!")
