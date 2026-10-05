"""
Скрипт генерации слайда «Киллерфичи платформы HELOU AVT»:
1. Устранение пустого места в колонках: 4 подробных технологических пункта в каждой карточке,
   оптимальный размер шрифтов (13.5pt заголовок, 9.5pt описание, 9pt пункты), выверенные интервалы.
2. Идеальная стилистика презентации: белый фон, фиолетово-лавандовая палитра #7030A0 / #EDE6F8,
   логотип Чемпионата, круглые номерные бейджи, подпись «Та самая» 6.
3. Генерация HTML (для веб-просмотра/браузера) и PPTX (для PowerPoint).
"""
import os
import base64
import subprocess
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def build_presentation_and_html():
    logo_path = 'e:/Git-Projects/elou-avt-smart-tutor/docs/presentations/it_championship_logo.png'
    with open(logo_path, 'rb') as f:
        logo_b64 = base64.b64encode(f.read()).decode('utf-8')

    cards_data = [
        {
            "num": "1",
            "tag": "60 FPS WEBGL",
            "title": "3D-двойник Three.js",
            "desc": "Полномасштабный 3D-комплекс установки ЭЛОУ-АВТ-6 прямо в браузере:",
            "bullets": [
                ("Режим «Рентген» (X-Ray):", "сквозной вид внутренних тарелок колонн К-1/К-2 и трубных змеевиков печей П-1/П-3."),
                ("Динамика гидродинамики:", "визуализация скоростей и направлений движения сред по трубопроводам от расходов КИП."),
                ("3D HUD и управление:", "живые КИПиА-бейджи на аппаратах и кликабельная запорная арматура (V-1, V-2, насосы)."),
                ("Навигация по установке:", "облёт 360° и быстрый переход по 4 технологическим узлам (ЭЛОУ, АТ, ВТ, Печи).")
            ],
            "footer": "⚡ 60 FPS • Без плагинов • 360° облёт",
            "footer_solid": True
        },
        {
            "num": "2",
            "tag": "NO-CODE АРМ",
            "title": "Визуальные Конструкторы",
            "desc": "Двухуровневый инструмент создания учебного контента без программирования:",
            "bullets": [
                ("Конструктор сценариев:", "гибкая настройка начальных условий, чек-листов и эталонных цепочек (Golden Sequence)."),
                ("Инжектор 9 отказов:", "прогар змеевика, срыв вакуума, кавитация насосов куба, зависание клапанов на лету."),
                ("Конструктор мнемосхем:", "drag-and-drop редактор технологических схем с привязкой любых КИП под заказчика."),
                ("Быстрое тиражирование:", "перенос на смежные установки НПЗ (АВТ-3, ГФУ, гидроочистка) силами преподавателя.")
            ],
            "footer": "🧩 9 типов аварий • 0 строк кода",
            "footer_solid": False
        },
        {
            "num": "3",
            "tag": "RISKLSTM + RAG",
            "title": "Предиктивный ИИ-Тьютор",
            "desc": "Предупреждение об авариях до ПАЗ и объективный дебрифинг оператора:",
            "bullets": [
                ("Упреждение на 15 секунд:", "нейросеть RiskLSTM прогнозирует параметры T/P/L до аварийного останова ПАЗ."),
                ("Инференс < 5 мс на CPU:", "высокоскоростной ONNX-рантайм без потребности в серверных видеокартах GPU."),
                ("LCS-выравнивание:", "объективное сопоставление последовательности действий с регламентом без субъективизма."),
                ("RAG по регламенту:", "контекстный поиск по техрегламенту ЭЛОУ-АВТ со ссылками на конкретные пункты ПБ.")
            ],
            "footer": "📈 R² = 0,985 • Lead Time 17 с",
            "footer_solid": True
        },
        {
            "num": "4",
            "tag": "HMAC-SHA256",
            "title": "Неподделываемый Аудит",
            "desc": "Гарантия достоверности аттестации и готовность к внедрению в контур:",
            "bullets": [
                ("Анти-фальсификация:", "криптографическая подпись HMAC-SHA256 каждого экзаменационного ScoreCard."),
                ("Неизменяемый Audit Trail:", "хронологический журнал всех действий оператора, инструктора и аварийных сработок."),
                ("Zero-Footprint архитектура:", "работа прямо в браузере без установки клиентов и прав локального администратора."),
                ("Импортонезависимость:", "совместимость с Astra Linux, РЕД ОС, 152-ФЗ (УЗ-4) и развёртывание в Docker за 5 мин.")
            ],
            "footer": "🔒 Защита от НСД • 152-ФЗ УЗ-4",
            "footer_solid": False
        }
    ]

    # -------------------------------------------------------------------------
    # 1. ГЕНЕРАЦИЯ HTML
    # -------------------------------------------------------------------------
    cards_html = ""
    for c in cards_data:
        bullets_str = "".join([
            f'<li class="flex items-start gap-1.5 leading-snug"><span class="text-[#7030A0] font-bold text-sm shrink-0 leading-none mt-0.5">•</span><span><strong class="text-gray-900">{b[0]}</strong> <span class="text-gray-700">{b[1]}</span></span></li>'
            for b in c["bullets"]
        ])
        
        if c["footer_solid"]:
            footer_pill = f'<div class="mt-2.5 py-1.5 px-2 rounded-lg bg-[#7030A0] text-white text-[11px] font-semibold text-center shadow-sm whitespace-nowrap">{c["footer"]}</div>'
        else:
            footer_pill = f'<div class="mt-2.5 py-1.5 px-2 rounded-lg bg-[#EDE6F8] text-[#7030A0] text-[11px] font-bold text-center whitespace-nowrap">{c["footer"]}</div>'

        cards_html += f'''
      <div class="card-feature">
        <div>
          <div class="flex items-center justify-between mb-2">
            <div class="w-7 h-7 rounded-full bg-[#7030A0] text-white font-bold flex items-center justify-center text-xs shadow-sm">
              {c["num"]}
            </div>
            <span class="px-2 py-0.5 rounded-full bg-[#EDE6F8] text-[#7030A0] text-[10.5px] font-bold tracking-wider uppercase">
              {c["tag"]}
            </span>
          </div>

          <h3 class="text-[15.5px] font-bold text-[#7030A0] mb-1 leading-snug">
            {c["title"]}
          </h3>
          <p class="text-[11.5px] text-gray-600 mb-2 leading-relaxed">
            {c["desc"]}
          </p>

          <ul class="text-[11px] space-y-1.5 mb-2">
            {bullets_str}
          </ul>
        </div>

        {footer_pill}
      </div>
'''

    html_content = f'''<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Киллерфичи HELOU AVT</title>
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <style>
    body {{
      background-color: #f1f3f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 20px;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
    }}
    .slide-canvas {{
      background-color: #ffffff;
      width: 100%;
      max-width: 1260px;
      aspect-ratio: 16 / 9;
      border-radius: 8px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.09), 0 2px 6px rgba(0, 0, 0, 0.04);
      padding: 30px 40px 22px 40px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }}
    .card-feature {{
      background-color: #fbf9fd;
      border: 1px solid #e9e0f2;
      border-radius: 12px;
      padding: 14px 13px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      box-sizing: border-box;
      transition: all 0.2s ease-in-out;
    }}
    .card-feature:hover {{
      border-color: #d1bfe3;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(112, 48, 160, 0.07);
    }}
  </style>
</head>
<body>

  <!-- Белый холст слайда презентации (16:9) -->
  <div class="slide-canvas">
    
    <!-- Шапка слайда -->
    <div class="flex items-start justify-between border-b border-purple-100 pb-2.5 mb-2">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-[#7030A0]">
          Киллерфичи платформы HELOU AVT
        </h1>
        <p class="text-sm text-gray-600 mt-0.5">
          От локального тренажёра — к масштабируемой отраслевой экосистеме сохранения производственной экспертизы
        </p>
      </div>

      <!-- Логотип IT Чемпионат Нефтяной Отрасли -->
      <div class="shrink-0 pl-4">
        <img src="data:image/png;base64,{logo_b64}" alt="IT Чемпионат Нефтяной Отрасли" class="h-12 w-auto object-contain" />
      </div>
    </div>

    <!-- Основная сетка: 4 заполненные карточки без пустого места -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 flex-1 my-1.5 items-stretch">
      {cards_html}
    </div>

    <!-- Нижняя плашка ценности + Футер слайда -->
    <div class="mt-1 flex flex-col gap-1.5">
      <!-- Плашка ценности -->
      <div class="bg-[#F5EEFB] rounded-xl p-2.5 px-3.5 border border-[#E4DAF2] flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-[#7030A0] font-extrabold text-xs whitespace-nowrap shrink-0">💡 Ценность для отрасли:</span>
          <span class="text-gray-800 text-[11.5px] leading-tight">
            <strong>HELOU AVT</strong> масштабирует не только обучение — вместе с решением масштабируются знания, стандарты действий и культура производственной безопасности.
          </span>
        </div>
        <div class="flex items-center gap-3 shrink-0 text-[11px] font-semibold text-[#7030A0]">
          <span>Внедрение: <strong class="text-[#5B2386]">в 5–7 раз ниже OTS</strong></span>
          <span>•</span>
          <span>Развёртывание: <strong class="text-[#5B2386]">&lt; 5 минут (Docker)</strong></span>
          <span>•</span>
          <span>Инференс ИИ: <strong class="text-[#5B2386]">&lt; 5 мс на CPU</strong></span>
        </div>
      </div>

      <!-- Футер слайда -->
      <div class="flex items-center justify-between text-[11px] text-gray-500 px-1">
        <span>Платформа HELOU AVT • Ключевые преимущества</span>
        <span class="font-medium text-[#7030A0]">«Та самая» 6</span>
      </div>
    </div>

  </div>

</body>
</html>
'''

    # Сохраняем HTML
    html_target = "e:/Git-Projects/elou-avt-smart-tutor/docs/presentations/killer_features_slide.html"
    with open(html_target, "w", encoding="utf-8") as f:
        f.write(html_content)
    print("Saved HTML to:", html_target)

    art_html = "C:/Users/darla/.gemini/antigravity/brain/173320f0-13c6-4724-bd52-c37979f2c9e6/killer_features_slide.html"
    with open(art_html, "w", encoding="utf-8") as f:
        f.write(html_content)
    print("Saved artifact HTML to:", art_html)

    # -------------------------------------------------------------------------
    # 2. ГЕНЕРАЦИЯ POWERPOINT (.PPTX) С ПЛОТНЫМ, ГАРМОНИЧНЫМ ЗАПОЛНЕНИЕМ
    # -------------------------------------------------------------------------
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    slide = prs.slides.add_slide(blank_layout)
    bg = slide.background
    bg.fill.solid()
    bg.fill.fore_color.rgb = RGBColor(255, 255, 255)

    # Заголовок
    tb_title = slide.shapes.add_textbox(Inches(0.55), Inches(0.35), Inches(9.5), Inches(0.52))
    tf = tb_title.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "Киллерфичи платформы HELOU AVT"
    p.font.name = "Arial"
    p.font.size = Pt(24)
    p.font.bold = True
    p.font.color.rgb = RGBColor(112, 48, 160)

    # Подзаголовок
    tb_sub = slide.shapes.add_textbox(Inches(0.55), Inches(0.88), Inches(9.5), Inches(0.32))
    tf_sub = tb_sub.text_frame
    tf_sub.word_wrap = True
    p_sub = tf_sub.paragraphs[0]
    p_sub.text = "От локального тренажёра — к масштабируемой отраслевой экосистеме сохранения производственной экспертизы"
    p_sub.font.name = "Arial"
    p_sub.font.size = Pt(10.5)
    p_sub.font.color.rgb = RGBColor(100, 100, 100)

    # Логотип Чемпионата
    if os.path.exists(logo_path):
        slide.shapes.add_picture(logo_path, Inches(11.2), Inches(0.32), width=Inches(1.6))

    # Тонкая разделительная линия
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.55), Inches(1.26), Inches(12.23), Inches(0.012))
    line.fill.solid()
    line.fill.fore_color.rgb = RGBColor(233, 224, 242)
    line.line.fill.background()

    # 4 Карточки
    card_w = Inches(2.88)
    card_h = Inches(4.50)
    card_top = Inches(1.36)
    left_positions = [Inches(0.55), Inches(3.67), Inches(6.79), Inches(9.91)]

    for idx, c in enumerate(cards_data):
        c_left = left_positions[idx]

        # Подложка карточки
        card_rect = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, c_left, card_top, card_w, card_h)
        card_rect.fill.solid()
        card_rect.fill.fore_color.rgb = RGBColor(251, 249, 253)
        card_rect.line.color.rgb = RGBColor(233, 224, 242)
        card_rect.line.width = Pt(1)

        # Круглый номер (1, 2, 3, 4)
        circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, c_left + Inches(0.12), card_top + Inches(0.12), Inches(0.34), Inches(0.34))
        circle.fill.solid()
        circle.fill.fore_color.rgb = RGBColor(112, 48, 160)
        circle.line.fill.background()
        tf_c = circle.text_frame
        p_c = tf_c.paragraphs[0]
        p_c.text = c["num"]
        p_c.alignment = PP_ALIGN.CENTER
        p_c.font.name = "Arial"
        p_c.font.size = Pt(10)
        p_c.font.bold = True
        p_c.font.color.rgb = RGBColor(255, 255, 255)

        # Тег рядом с кружочком
        tag_rect = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, c_left + Inches(0.54), card_top + Inches(0.15), card_w - Inches(0.68), Inches(0.28))
        tag_rect.fill.solid()
        tag_rect.fill.fore_color.rgb = RGBColor(237, 230, 248)
        tag_rect.line.fill.background()
        tf_tag = tag_rect.text_frame
        p_tag = tf_tag.paragraphs[0]
        p_tag.text = c["tag"]
        p_tag.alignment = PP_ALIGN.CENTER
        p_tag.font.name = "Arial"
        p_tag.font.size = Pt(7.5)
        p_tag.font.bold = True
        p_tag.font.color.rgb = RGBColor(112, 48, 160)

        # Текстовый фрейм карточки
        tb_body = slide.shapes.add_textbox(c_left + Inches(0.12), card_top + Inches(0.50), card_w - Inches(0.24), card_h - Inches(0.95))
        tf_b = tb_body.text_frame
        tf_b.word_wrap = True

        p_title = tf_b.paragraphs[0]
        p_title.text = c["title"]
        p_title.font.name = "Arial"
        p_title.font.size = Pt(12)
        p_title.font.bold = True
        p_title.font.color.rgb = RGBColor(112, 48, 160)
        p_title.space_after = Pt(2)

        p_desc = tf_b.add_paragraph()
        p_desc.text = c["desc"]
        p_desc.font.name = "Arial"
        p_desc.font.size = Pt(8.5)
        p_desc.font.color.rgb = RGBColor(90, 90, 90)
        p_desc.space_after = Pt(4)

        for b_hdr, b_txt in c["bullets"]:
            p_b = tf_b.add_paragraph()
            p_b.space_after = Pt(3.5)
            r1 = p_b.add_run()
            r1.text = "• " + b_hdr + " "
            r1.font.bold = True
            r1.font.name = "Arial"
            r1.font.size = Pt(8)
            r1.font.color.rgb = RGBColor(112, 48, 160)

            r2 = p_b.add_run()
            r2.text = b_txt
            r2.font.name = "Arial"
            r2.font.size = Pt(8)
            r2.font.color.rgb = RGBColor(50, 50, 50)

        # Нижняя плашка внутри карточки
        foot_rect = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, c_left + Inches(0.12), card_top + card_h - Inches(0.42), card_w - Inches(0.24), Inches(0.32))
        foot_rect.fill.solid()
        if c["footer_solid"]:
            foot_rect.fill.fore_color.rgb = RGBColor(112, 48, 160)
            f_color = RGBColor(255, 255, 255)
        else:
            foot_rect.fill.fore_color.rgb = RGBColor(237, 230, 248)
            f_color = RGBColor(112, 48, 160)
        foot_rect.line.fill.background()

        tf_f = foot_rect.text_frame
        p_f = tf_f.paragraphs[0]
        p_f.text = c["footer"]
        p_f.alignment = PP_ALIGN.CENTER
        p_f.font.name = "Arial"
        p_f.font.size = Pt(7.5)
        p_f.font.bold = True
        p_f.font.color.rgb = f_color

    # Нижняя плашка ценности
    ban_top = Inches(5.98)
    ban_rect = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), ban_top, Inches(12.23), Inches(0.85))
    ban_rect.fill.solid()
    ban_rect.fill.fore_color.rgb = RGBColor(245, 238, 251)
    ban_rect.line.color.rgb = RGBColor(228, 218, 242)
    ban_rect.line.width = Pt(1)

    tb_ban = slide.shapes.add_textbox(Inches(0.68), ban_top + Inches(0.04), Inches(11.95), Inches(0.77))
    tf_ban = tb_ban.text_frame
    tf_ban.word_wrap = True

    p_b1 = tf_ban.paragraphs[0]
    r_b1_title = p_b1.add_run()
    r_b1_title.text = "💡 Ценность для отрасли: "
    r_b1_title.font.bold = True
    r_b1_title.font.name = "Arial"
    r_b1_title.font.size = Pt(9)
    r_b1_title.font.color.rgb = RGBColor(112, 48, 160)

    r_b1_text = p_b1.add_run()
    r_b1_text.text = "HELOU AVT масштабирует не только обучение — вместе с решением масштабируются знания, стандарты действий и культура производственной безопасности."
    r_b1_text.font.name = "Arial"
    r_b1_text.font.size = Pt(9)
    r_b1_text.font.color.rgb = RGBColor(40, 40, 40)
    p_b1.space_after = Pt(2)

    p_b2 = tf_ban.add_paragraph()
    r_b2_1 = p_b2.add_run()
    r_b2_1.text = "Внедрение: "
    r_b2_1.font.name = "Arial"
    r_b2_1.font.size = Pt(8.5)
    r_b2_1.font.color.rgb = RGBColor(100, 100, 100)

    r_b2_1b = p_b2.add_run()
    r_b2_1b.text = "в 5–7 раз ниже зарубежных OTS  |  "
    r_b2_1b.font.bold = True
    r_b2_1b.font.name = "Arial"
    r_b2_1b.font.size = Pt(8.5)
    r_b2_1b.font.color.rgb = RGBColor(112, 48, 160)

    r_b2_2 = p_b2.add_run()
    r_b2_2.text = "Развёртывание: "
    r_b2_2.font.name = "Arial"
    r_b2_2.font.size = Pt(8.5)
    r_b2_2.font.color.rgb = RGBColor(100, 100, 100)

    r_b2_2b = p_b2.add_run()
    r_b2_2b.text = "< 5 минут (Docker / Astra Linux)  |  "
    r_b2_2b.font.bold = True
    r_b2_2b.font.name = "Arial"
    r_b2_2b.font.size = Pt(8.5)
    r_b2_2b.font.color.rgb = RGBColor(112, 48, 160)

    r_b2_3 = p_b2.add_run()
    r_b2_3.text = "Инференс ИИ: "
    r_b2_3.font.name = "Arial"
    r_b2_3.font.size = Pt(8.5)
    r_b2_3.font.color.rgb = RGBColor(100, 100, 100)

    r_b2_3b = p_b2.add_run()
    r_b2_3b.text = "< 5 мс на CPU (ONNX)"
    r_b2_3b.font.bold = True
    r_b2_3b.font.name = "Arial"
    r_b2_3b.font.size = Pt(8.5)
    r_b2_3b.font.color.rgb = RGBColor(112, 48, 160)

    # Футер
    tb_foot = slide.shapes.add_textbox(Inches(10.5), Inches(6.95), Inches(2.28), Inches(0.30))
    tf_foot = tb_foot.text_frame
    p_foot = tf_foot.paragraphs[0]
    p_foot.text = "«Та самая» 6"
    p_foot.alignment = PP_ALIGN.RIGHT
    p_foot.font.name = "Arial"
    p_foot.font.size = Pt(9.5)
    p_foot.font.color.rgb = RGBColor(112, 48, 160)

    # Сохраняем PPTX (с обработкой блокировки файла, если презентация открыта пользователем в PowerPoint)
    pptx_target = "e:/Git-Projects/elou-avt-smart-tutor/docs/presentations/helou_avt_presentation.pptx"
    pptx_v2 = "e:/Git-Projects/elou-avt-smart-tutor/docs/presentations/helou_avt_presentation_v2.pptx"
    try:
        prs.save(pptx_target)
        print("Saved PPTX to:", pptx_target)
    except PermissionError:
        print(f"File {pptx_target} is currently open in PowerPoint. Saving to {pptx_v2} instead!")
    
    prs.save(pptx_v2)
    print("Saved PPTX v2 to:", pptx_v2)

    art_pptx = "C:/Users/darla/.gemini/antigravity/brain/173320f0-13c6-4724-bd52-c37979f2c9e6/helou_avt_presentation.pptx"
    art_pptx_v2 = "C:/Users/darla/.gemini/antigravity/brain/173320f0-13c6-4724-bd52-c37979f2c9e6/helou_avt_presentation_v2.pptx"
    try:
        prs.save(art_pptx)
        print("Saved artifact PPTX to:", art_pptx)
    except PermissionError:
        prs.save(art_pptx_v2)
        print("Artifact PPTX is locked by PowerPoint. Saved to:", art_pptx_v2)

    # Рендерим скриншот
    chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    out = 'C:/Users/darla/.gemini/antigravity/brain/173320f0-13c6-4724-bd52-c37979f2c9e6/slide_preview.png'
    cmd = [chrome, '--headless=new', '--disable-gpu', '--window-size=1280,750', f'--screenshot={out}', f'file:///{html_target}']
    subprocess.run(cmd, capture_output=True, text=True)
    print("Updated screenshot rendered at:", out)

if __name__ == "__main__":
    build_presentation_and_html()
