// ===== SCRIPTS DATA (KO/EN/JA/ZH) =====
const SCRIPTS = [
  {
    id: 'welcome', icon: '✈️', colorClass: 'c-blue',
    difficulty: '기본', difficultyClass: '',
    title: '탑승 환영 방송',
    langs: {
      ko: {
        sttLang: 'ko-KR', idealWPM: 130,
        checkpoints: ['환영 인사', '항공사명', '출발지·목적지·편명', '기장 소개', '비행시간', '마무리 인사'],
        keyPhrases: ['안녕하십니까', '탑승해 주신', '환영합니다', '기장', '비행 예정 시간', '감사합니다'],
        tips: ['밝고 따뜻한 목소리로 시작', '편명·목적지는 또렷하게', '마지막 감사합니다에 미소를'],
        text: `승객 여러분, 안녕하십니까.
저희 우리항공에 탑승해 주신 것을 진심으로 환영합니다.
이 비행기는 서울 인천을 출발하여 도쿄 나리타로 향하는 우리항공 201편입니다.
오늘 비행을 담당하실 기장은 김민준 기장이시며, 비행 예정 시간은 약 2시간 30분입니다.
저희 객실 승무원 일동은 여러분의 안전하고 편안한 여행을 위해 최선을 다하겠습니다.
감사합니다.`
      },
      en: {
        sttLang: 'en-US', idealWPM: 140,
        checkpoints: ['Greeting', 'Airline name', 'Flight number & destination', 'Captain intro', 'Flight time', 'Closing'],
        keyPhrases: ['welcome', 'Woori Air', 'flight', 'captain', 'flight time', 'thank you'],
        tips: ['Warm, clear opening tone', 'Emphasize flight number and destination', 'Smile through the closing'],
        text: `Ladies and gentlemen, good day.
Welcome aboard Woori Air. This is Woori Air flight 201, departing Seoul Incheon International Airport for Tokyo Narita International Airport.
Your captain today is Captain Kim Min-jun, and our estimated flight time is approximately two hours and thirty minutes.
Our cabin crew are fully dedicated to ensuring your safety and comfort throughout the journey.
Thank you.`
      },
      ja: {
        sttLang: 'ja-JP', idealWPM: 115,
        checkpoints: ['ご挨拶', '航空会社名', '便名・目的地', '機長紹介', '飛行時間', '締めの言葉'],
        keyPhrases: ['こんにちは', 'ご搭乗', 'ありがとうございます', '機長', '飛行予定時間', 'よろしくお願いいたします'],
        tips: ['落ち着いた丁寧なトーンで', '便名・目的地は明確に', '長音をしっかり伸ばして'],
        text: `お客様、こんにちは。
ウリ航空にご搭乗いただき、誠にありがとうございます。
この便は、ソウル仁川国際空港を出発し、東京成田国際空港へ向かうウリ航空201便でございます。
本日の機長はキム・ミンジュン機長でございます。飛行予定時間は約2時間30分でございます。
客室乗務員一同、皆様の安全で快適な空の旅のため、精一杯努めてまいります。
どうぞよろしくお願いいたします。`
      },
      zh: {
        sttLang: 'zh-CN', idealWPM: 120,
        checkpoints: ['问候语', '航空公司名', '航班号·目的地', '机长介绍', '飞行时间', '结束语'],
        keyPhrases: ['您好', '欢迎乘坐', '航班', '机长', '飞行时间', '感谢'],
        tips: ['声调准确，语气亲切', '航班号·目的地发音清晰', '结尾要充满感谢之情'],
        text: `各位旅客，您好。
欢迎乘坐我们航空。本次航班是从首尔仁川国际机场出发，飞往东京成田国际机场的我们航空201航班。
今天为您驾驶飞机的机长是金民俊机长，预计飞行时间约为两小时三十分钟。
全体客舱乘务员将竭诚为您提供安全舒适的乘坐体验。
感谢您的乘坐。`
      }
    }
  },
  {
    id: 'safety', icon: '🛡️', colorClass: 'c-orange',
    difficulty: '중급', difficultyClass: 'medium',
    title: '이륙 전 안전 안내',
    langs: {
      ko: {
        sttLang: 'ko-KR', idealWPM: 125,
        checkpoints: ['출발 예정', '좌석 벨트', '금연', '전자기기', '비상구', '협조 감사'],
        keyPhrases: ['좌석 벨트', '착용', '흡연', '금지', '비행 모드', '비상구', '감사합니다'],
        tips: ['차분하고 명확하게', '중요 항목마다 강세', '진심 어린 협조 요청'],
        text: `승객 여러분, 잠시 후 항공기가 출발할 예정입니다. 안전을 위해 다음 사항을 안내해 드리겠습니다.
좌석 벨트는 허리에 꼭 맞게 착용하시고, 항공기가 완전히 착륙하여 좌석 벨트 착용 표시등이 꺼질 때까지 착용해 주시기 바랍니다.
기내 흡연은 법으로 금지되어 있으며, 화장실 내 흡연도 금지됩니다.
휴대용 전자기기는 비행 모드로 전환해 주시고, 이륙 및 착륙 시에는 사용을 자제해 주시기 바랍니다.
비상구 위치는 앞쪽과 뒤쪽에 있으며, 가장 가까운 비상구가 뒤쪽에 있을 수 있습니다.
안전한 여행을 위해 협조해 주셔서 감사합니다.`
      },
      en: {
        sttLang: 'en-US', idealWPM: 135,
        checkpoints: ['Departure notice', 'Seatbelt', 'No smoking', 'Electronic devices', 'Emergency exits', 'Thank you'],
        keyPhrases: ['seatbelt', 'fasten', 'smoking', 'prohibited', 'flight mode', 'emergency exits', 'thank you'],
        tips: ['Calm, authoritative tone', 'Pause between each safety item', 'Make passengers feel reassured'],
        text: `Ladies and gentlemen, we will be departing shortly. For your safety, please note the following.
Please fasten your seatbelt securely around your waist, and keep it fastened whenever you are seated.
Smoking is strictly prohibited on board, including in the lavatories.
Please set your portable electronic devices to flight mode and refrain from using them during takeoff and landing.
Emergency exits are located at the front and rear of the aircraft. The nearest exit may be behind you.
Thank you for your cooperation and have a safe flight.`
      },
      ja: {
        sttLang: 'ja-JP', idealWPM: 110,
        checkpoints: ['出発案内', 'シートベルト', '禁煙', '電子機器', '非常口', 'ご協力のお礼'],
        keyPhrases: ['シートベルト', 'お締め', '喫煙', '禁止', '機内モード', '非常口', 'ありがとうございます'],
        tips: ['落ち着いた安心感のある声で', '各項目をはっきり区切って', '最後は感謝の気持ちを込めて'],
        text: `お客様、まもなく出発いたします。安全のため、以下の点についてご案内いたします。
シートベルトはウエストにしっかりとお締めいただき、着席中は常にシートベルトをお締めください。
機内での喫煙は法律により禁止されております。お手洗いでの喫煙も禁じられております。
携帯電子機器は機内モードに設定していただき、離着陸時のご使用はご遠慮ください。
非常口は前方と後方にございます。最も近い非常口が後方にある場合もございます。
皆様のご協力をよろしくお願いいたします。ありがとうございます。`
      },
      zh: {
        sttLang: 'zh-CN', idealWPM: 118,
        checkpoints: ['起飞通知', '安全带', '禁止吸烟', '电子设备', '紧急出口', '感谢配合'],
        keyPhrases: ['安全带', '系好', '禁止吸烟', '飞行模式', '紧急出口', '感谢'],
        tips: ['沉稳清晰的语气', '每项安全提示要停顿', '四声发音要准确'],
        text: `各位旅客，本次航班即将起飞。为了您的安全，请注意以下事项。
请将安全带牢固系好，并在座位上时保持系好状态。
机内全程严禁吸烟，包括在洗手间内。
请将随身电子设备调至飞行模式，起飞和降落期间请勿使用。
紧急出口位于机舱前后部，最近的紧急出口可能在您身后。
感谢您的配合，祝您旅途安全。谢谢。`
      }
    }
  },
  {
    id: 'cruise', icon: '☁️', colorClass: 'c-green',
    difficulty: '기본', difficultyClass: '',
    title: '순항 고도 도달 안내',
    langs: {
      ko: {
        sttLang: 'ko-KR', idealWPM: 130,
        checkpoints: ['순항 고도 도달', '좌석 벨트 안내', '좌석 이용', '서비스 예고', '인사'],
        keyPhrases: ['순항 고도', '좌석 벨트', '서비스', '편안한', '여행'],
        tips: ['여유롭고 편안한 톤', '승객이 긴장을 풀 수 있도록', '서비스 예고 시 기대감 전달'],
        text: `승객 여러분, 저희 항공기는 현재 순항 고도에 도달하였습니다.
좌석 벨트 착용 표시등이 꺼졌습니다만, 갑작스러운 기류 변화에 대비하여 착석 시에는 항상 좌석 벨트를 가볍게 착용해 주시기 바랍니다.
이제 좌석을 편안하게 젖히실 수 있으며, 기내 엔터테인먼트 서비스를 이용하실 수 있습니다.
잠시 후 음료 및 기내식 서비스를 시작하겠습니다.
편안하고 즐거운 여행 되십시오.`
      },
      en: {
        sttLang: 'en-US', idealWPM: 140,
        checkpoints: ['Cruising altitude', 'Seatbelt reminder', 'Seat recline', 'Service announcement', 'Closing'],
        keyPhrases: ['cruising altitude', 'seatbelt', 'recline', 'service', 'comfortable', 'enjoy'],
        tips: ['Relaxed and warm tone', 'Help passengers unwind', 'Build anticipation for service'],
        text: `Ladies and gentlemen, we have now reached our cruising altitude.
Although the seatbelt sign has been turned off, we recommend keeping your seatbelt loosely fastened whenever you are seated, in case of unexpected turbulence.
You may now recline your seats and enjoy the in-flight entertainment.
We will begin our beverage and meal service shortly.
Please sit back, relax, and enjoy your flight.`
      },
      ja: {
        sttLang: 'ja-JP', idealWPM: 112,
        checkpoints: ['巡航高度到達', 'シートベルト案内', 'リクライニング案内', 'サービス予告', '締めの言葉'],
        keyPhrases: ['巡航高度', 'シートベルト', 'お座席', 'サービス', 'ごゆっくり'],
        tips: ['ゆったりとしたリラックスしたトーンで', '乗客が安心できるよう丁寧に', '長音をしっかり伸ばして'],
        text: `お客様、ただいま巡航高度に達しました。
シートベルト着用サインが消えましたが、突然の揺れに備え、お座席でのシートベルトの着用をお勧めいたします。
お座席のリクライニングをご利用いただけます。また、機内エンターテインメントもお楽しみいただけます。
まもなく、お飲み物と機内食のサービスを開始いたします。
どうぞごゆっくりお過ごしください。`
      },
      zh: {
        sttLang: 'zh-CN', idealWPM: 118,
        checkpoints: ['到达巡航高度', '安全带提示', '座椅使用', '服务预告', '结束语'],
        keyPhrases: ['巡航高度', '安全带', '座椅', '服务', '舒适'],
        tips: ['轻松愉快的语气', '让乘客放松下来', '对服务预告要充满期待感'],
        text: `各位旅客，本次航班已到达巡航高度。
安全带指示灯已关闭，但为防止突然气流颠簸，建议在座位上时保持安全带松紧适度地系好。
现在可以调整座椅靠背，并享用机内娱乐服务。
稍后我们将开始提供饮料及机餐服务。
请放松心情，享受愉快的旅途。`
      }
    }
  },
  {
    id: 'meal', icon: '🍽️', colorClass: 'c-purple',
    difficulty: '중급', difficultyClass: 'medium',
    title: '기내식 서비스 안내',
    langs: {
      ko: {
        sttLang: 'ko-KR', idealWPM: 128,
        checkpoints: ['서비스 시작 예고', '메뉴 안내', '음료 안내', '좌석 정리', '알레르기 안내', '호출 버튼'],
        keyPhrases: ['기내식', '비빔밥', '파스타', '음료', '테이블', '알레르기', '호출 버튼'],
        tips: ['메뉴를 맛있게 들리도록', '알레르기 안내는 명확하게', '친근하고 도움이 되는 인상'],
        text: `승객 여러분, 잠시 후 기내식 서비스를 시작하겠습니다.
오늘 제공해 드리는 기내식은 비빔밥과 크림 파스타 두 가지이며, 음료는 주스, 탄산음료, 생수, 커피, 녹차를 준비하였습니다.
식사 전 테이블을 내려주시고 좌석을 원래 위치로 세워 주시기 바랍니다.
알레르기가 있으신 승객께서는 승무원에게 미리 말씀해 주시기 바랍니다.
필요하신 사항이 있으시면 좌석 위 호출 버튼을 눌러 주세요.
감사합니다.`
      },
      en: {
        sttLang: 'en-US', idealWPM: 138,
        checkpoints: ['Service announcement', 'Menu options', 'Beverages', 'Tray table', 'Allergy notice', 'Call button'],
        keyPhrases: ['meal service', 'bibimbap', 'pasta', 'beverages', 'tray table', 'allergy', 'call button'],
        tips: ['Make the food sound appetizing', 'Clear and distinct menu items', 'Warm and attentive tone'],
        text: `Ladies and gentlemen, we will begin our meal service shortly.
Today we are offering two meal options: bibimbap and creamy pasta. Available beverages include juice, soft drinks, water, coffee, and green tea.
Please lower your tray table and return your seat to the upright position before the meal.
If you have any food allergies, please inform our cabin crew in advance.
If you need any assistance, please press the call button above your seat.
Thank you.`
      },
      ja: {
        sttLang: 'ja-JP', idealWPM: 108,
        checkpoints: ['サービス開始予告', 'メニュー案内', 'お飲み物案内', 'テーブル準備', 'アレルギー案内', 'コールボタン'],
        keyPhrases: ['機内食', 'ビビンバ', 'パスタ', 'お飲み物', 'テーブル', 'アレルギー', 'コールボタン'],
        tips: ['食欲をそそるような明るいトーンで', 'アレルギー案内は特に明確に', '親切で丁寧な言い回しを'],
        text: `お客様、まもなく機内食のサービスを開始いたします。
本日のお食事はビビンバとクリームパスタの二種類をご用意しております。お飲み物はジュース、炭酸飲料、お水、コーヒー、緑茶をご用意しております。
お食事の前にテーブルをお開きになり、お座席を元の位置にお戻しください。
食物アレルギーのあるお客様は、事前に客室乗務員にお申し付けください。
ご不明な点がございましたら、頭上のコールボタンをお押しください。
ありがとうございます。`
      },
      zh: {
        sttLang: 'zh-CN', idealWPM: 116,
        checkpoints: ['服务开始通知', '餐食介绍', '饮料介绍', '餐桌准备', '过敏提示', '呼叫按钮'],
        keyPhrases: ['机餐', '拌饭', '意大利面', '饮料', '餐桌', '过敏', '呼叫按钮'],
        tips: ['让食物听起来美味', '过敏提示要清晰', '亲切热情的服务态度'],
        text: `各位旅客，我们即将开始机餐服务。
今日为您提供两种餐食：拌饭和奶油意大利面。饮料包括果汁、碳酸饮料、矿泉水、咖啡和绿茶。
用餐前请放下餐桌，并将座椅调回原位。
如果您有食物过敏，请提前告知乘务员。
如需帮助，请按头顶上方的呼叫按钮。
谢谢。`
      }
    }
  },
  {
    id: 'prelanding', icon: '🛬', colorClass: 'c-yellow',
    difficulty: '기본', difficultyClass: '',
    title: '착륙 준비 안내',
    langs: {
      ko: {
        sttLang: 'ko-KR', idealWPM: 125,
        checkpoints: ['착륙 예정', '목적지명', '좌석 벨트', '등받이·테이블', '전자기기', '착석 유지'],
        keyPhrases: ['착륙', '나리타', '좌석 벨트', '등받이', '테이블', '비행 모드'],
        tips: ['차분하고 안정감 있게', '각 지시사항을 명확히 구분', '안도감을 주는 마무리'],
        text: `승객 여러분, 잠시 후 저희 항공기는 도쿄 나리타 국제공항에 착륙할 예정입니다.
좌석 벨트를 착용해 주시고, 등받이와 테이블을 원래 위치로 세워 주시기 바랍니다.
휴대용 전자기기는 비행 모드를 유지해 주시고, 창문 덮개를 열어 주시기 바랍니다.
착륙 후 항공기가 완전히 정지하고 좌석 벨트 착용 표시등이 꺼질 때까지 자리에 앉아 계시기 바랍니다.
감사합니다.`
      },
      en: {
        sttLang: 'en-US', idealWPM: 132,
        checkpoints: ['Landing notice', 'Destination name', 'Seatbelt', 'Seat & table', 'Electronic devices', 'Remain seated'],
        keyPhrases: ['landing', 'Narita', 'seatbelt', 'upright position', 'tray table', 'flight mode', 'remain seated'],
        tips: ['Calm and reassuring tone', 'Clear instructions in sequence', 'Warm closing'],
        text: `Ladies and gentlemen, we will shortly be landing at Tokyo Narita International Airport.
Please fasten your seatbelt and return your seat back and tray table to the upright and locked position.
Please keep your portable electronic devices in flight mode and open your window shades.
After landing, please remain seated until the aircraft has come to a complete stop and the seatbelt sign has been turned off.
Thank you.`
      },
      ja: {
        sttLang: 'ja-JP', idealWPM: 108,
        checkpoints: ['着陸予告', '目的地名', 'シートベルト', 'シート・テーブル', '電子機器', '着席維持'],
        keyPhrases: ['着陸', '成田', 'シートベルト', 'お座席', 'テーブル', '機内モード'],
        tips: ['落ち着いた安心感のある声で', '各指示を明確に伝える', '温かい締めの言葉を'],
        text: `お客様、まもなく東京成田国際空港に着陸いたします。
シートベルトをお締めいただき、お座席の背もたれとテーブルを元の位置にお戻しください。
携帯電子機器は機内モードを維持していただき、窓のシェードをお開けください。
着陸後、航空機が完全に停止し、シートベルト着用サインが消えるまで、お座席にお座りください。
ありがとうございます。`
      },
      zh: {
        sttLang: 'zh-CN', idealWPM: 115,
        checkpoints: ['降落通知', '目的地名称', '安全带', '座椅·桌板', '电子设备', '保持就座'],
        keyPhrases: ['降落', '成田', '安全带', '靠背', '桌板', '飞行模式'],
        tips: ['沉稳安心的语气', '每条指令清晰传达', '温暖的结束语'],
        text: `各位旅客，本次航班即将降落至东京成田国际机场。
请系好安全带，并将座椅靠背和小桌板恢复原位。
请将随身电子设备保持飞行模式，并打开遮阳板。
落地后，请在飞机完全停稳、安全带指示灯熄灭之前保持就座。
谢谢。`
      }
    }
  },
  {
    id: 'arrival', icon: '🏁', colorClass: 'c-green',
    difficulty: '기본', difficultyClass: '',
    title: '도착 안내 방송',
    langs: {
      ko: {
        sttLang: 'ko-KR', idealWPM: 130,
        checkpoints: ['도착 안내', '현지 시각', '현지 기온', '착석 유지', '수하물 주의', '감사 인사'],
        keyPhrases: ['도착', '나리타', '현지 시각', '기온', '수하물', '감사합니다'],
        tips: ['도착의 기쁨과 안도감', '현지 정보는 또렷하게', '진심 어린 감사 인사'],
        text: `승객 여러분, 저희 항공기는 도쿄 나리타 국제공항에 무사히 도착하였습니다.
현지 시각은 오후 2시 30분이며, 현재 기온은 섭씨 18도입니다.
비행기가 완전히 멈추고 좌석 벨트 착용 표시등이 꺼진 후에 자리에서 일어나 주시기 바랍니다.
짐칸에 보관하신 수하물을 꺼내실 때에는 안전에 주의해 주시기 바랍니다.
저희 우리항공을 이용해 주셔서 대단히 감사합니다. 즐겁고 행복한 여행 되시기 바랍니다.
감사합니다.`
      },
      en: {
        sttLang: 'en-US', idealWPM: 138,
        checkpoints: ['Arrival announcement', 'Local time', 'Temperature', 'Remain seated', 'Overhead bins', 'Thank you'],
        keyPhrases: ['arrived', 'Narita', 'local time', 'temperature', 'overhead bins', 'thank you'],
        tips: ['Warm and joyful tone', 'Clear local info', 'Heartfelt thank-you closing'],
        text: `Ladies and gentlemen, we have arrived at Tokyo Narita International Airport.
The local time is 2:30 in the afternoon, and the current temperature is 18 degrees Celsius.
Please remain seated until the aircraft has come to a complete stop and the seatbelt sign has been turned off.
When retrieving your belongings from the overhead bins, please take care as items may have shifted during the flight.
Thank you for flying with Woori Air. We hope you had an enjoyable journey and look forward to welcoming you on board again.
Thank you.`
      },
      ja: {
        sttLang: 'ja-JP', idealWPM: 110,
        checkpoints: ['到着案内', '現地時刻', '現地気温', '着席維持', '手荷物注意', 'お礼の言葉'],
        keyPhrases: ['到着', '成田', '現地時刻', '気温', '手荷物', 'ありがとうございました'],
        tips: ['到着の安堵感と喜びを', '現地情報は明確に', '心からの感謝を込めて'],
        text: `お客様、ただいま東京成田国際空港に無事到着いたしました。
現地時刻は午後2時30分、現在の気温は摂氏18度でございます。
航空機が完全に停止し、シートベルト着用サインが消えるまで、お座席にお座りください。
頭上の荷物棚からお荷物をお取り出しの際は、落下にご注意ください。
本日はウリ航空をご利用いただき、誠にありがとうございました。またのご搭乗を心よりお待ち申し上げております。`
      },
      zh: {
        sttLang: 'zh-CN', idealWPM: 118,
        checkpoints: ['到达通知', '当地时间', '当地温度', '保持就座', '行李提示', '感谢语'],
        keyPhrases: ['到达', '成田', '当地时间', '温度', '行李', '感谢'],
        tips: ['到达时的喜悦与安慰', '当地信息要清晰', '真诚的感谢结束语'],
        text: `各位旅客，本次航班已安全抵达东京成田国际机场。
当地时间为下午2时30分，目前气温为摄氏18度。
请在飞机完全停稳、安全带指示灯熄灭后再起身。
取放头顶行李架中的物品时，请注意安全，防止物品掉落。
感谢您乘坐我们航空。希望您旅途愉快，期待再次为您服务。谢谢。`
      }
    }
  },
  {
    id: 'turbulence', icon: '⛈️', colorClass: 'c-red',
    difficulty: '고급', difficultyClass: 'hard',
    title: '난기류 안내 방송',
    langs: {
      ko: {
        sttLang: 'ko-KR', idealWPM: 120,
        checkpoints: ['상황 설명', '좌석 복귀 지시', '좌석 벨트', '화장실 금지', '안전 보장', '사과'],
        keyPhrases: ['기상', '흔들릴', '좌석 벨트', '착용', '화장실', '안전', '죄송합니다'],
        tips: ['침착하고 안정적인 목소리', '공황 없이 명확한 지시', '빠르고 정확하게'],
        text: `승객 여러분, 현재 기상 상황으로 인해 항공기가 흔들릴 수 있습니다.
안전을 위해 즉시 좌석으로 돌아가 좌석 벨트를 착용해 주시기 바랍니다.
화장실 이용도 잠시 삼가 주시기 바랍니다.
기장과 승무원들은 여러분의 안전을 위해 최선을 다하고 있습니다.
불편을 드려 대단히 죄송합니다. 안정될 때까지 잠시만 기다려 주시기 바랍니다.`
      },
      en: {
        sttLang: 'en-US', idealWPM: 128,
        checkpoints: ['Situation', 'Return to seat', 'Fasten seatbelt', 'Lavatories', 'Safety assurance', 'Apology'],
        keyPhrases: ['turbulence', 'return', 'seatbelt', 'fasten', 'lavatories', 'safety', 'sorry'],
        tips: ['Calm but urgent', 'Clear direct instructions', 'Reassure without alarming'],
        text: `Ladies and gentlemen, we are currently experiencing turbulence due to weather conditions.
For your safety, please return to your seats immediately and fasten your seatbelt.
Please also refrain from using the lavatories at this time.
Your captain and cabin crew are doing their utmost to ensure your safety.
We apologize for the inconvenience and ask for your patience until conditions improve.`
      },
      ja: {
        sttLang: 'ja-JP', idealWPM: 105,
        checkpoints: ['状況説明', '着席指示', 'シートベルト', 'トイレ使用禁止', '安全確保', 'お詫び'],
        keyPhrases: ['気流', '揺れ', 'シートベルト', 'お締め', 'お手洗い', '安全', '申し訳'],
        tips: ['落ち着いた安心できる声で', 'パニックを起こさせないように', '迅速かつ明確に'],
        text: `お客様、ただいま気流の影響により、航空機が揺れることがございます。
安全のため、ただちにお座席にお戻りになり、シートベルトをお締めください。
お手洗いのご使用もしばらくお控えください。
機長および客室乗務員は、皆様の安全確保に全力を尽くしております。
ご不便をおかけし、大変申し訳ございません。安定するまでしばらくお待ちください。`
      },
      zh: {
        sttLang: 'zh-CN', idealWPM: 112,
        checkpoints: ['情况说明', '返回座位', '系好安全带', '禁用洗手间', '安全保障', '道歉'],
        keyPhrases: ['气流颠簸', '座位', '安全带', '系好', '洗手间', '安全', '抱歉'],
        tips: ['冷静而有力的声音', '清晰直接的指令', '让乘客感到安心'],
        text: `各位旅客，由于气象原因，飞机目前可能出现颠簸。
为了您的安全，请立即返回座位并系好安全带。
同时请暂时不要使用洗手间。
机长和乘务员正在全力确保各位旅客的安全。
给您带来不便，深感抱歉。请耐心等候，直至飞行恢复平稳。`
      }
    }
  },
  {
    id: 'delay', icon: '⏰', colorClass: 'c-red',
    difficulty: '고급', difficultyClass: 'hard',
    title: '출발 지연 안내',
    langs: {
      ko: {
        sttLang: 'ko-KR', idealWPM: 120,
        checkpoints: ['인사', '지연 원인', '지연 시간', '사과', '이유 설명', '대기 요청', '보상 서비스', '재사과'],
        keyPhrases: ['지연', '점검', '죄송합니다', '안전', '양해', '음료 서비스'],
        tips: ['진심 어린 사과', '지연 이유와 시간 명확하게', '보상 서비스로 불편 최소화'],
        text: `승객 여러분, 안녕하십니까.
현재 기술적인 점검으로 인해 출발이 약 30분 지연되고 있습니다.
불편을 드려 대단히 죄송합니다.
승객 여러분의 안전한 운항을 위해 반드시 필요한 점검임을 양해해 주시기 바랍니다.
추가적인 안내가 있을 때까지 좌석에서 기다려 주시기 바랍니다.
기다리시는 동안 음료 서비스를 제공해 드리겠습니다.
불편을 끼쳐드려 다시 한번 사과드립니다.`
      },
      en: {
        sttLang: 'en-US', idealWPM: 128,
        checkpoints: ['Greeting', 'Cause of delay', 'Delay duration', 'Apology', 'Explanation', 'Wait request', 'Compensation', 'Second apology'],
        keyPhrases: ['delay', 'technical', 'sorry', 'safety', 'understand', 'beverage service', 'apologize'],
        tips: ['Sincere apology in voice', 'Clear reason and time', 'Offer compensation warmly'],
        text: `Ladies and gentlemen, good day.
We regret to inform you that our departure has been delayed by approximately 30 minutes due to a technical inspection.
We sincerely apologize for this inconvenience.
This inspection is absolutely necessary to ensure the safety of your flight, and we kindly ask for your understanding.
Please remain in your seats and await further announcements.
We will be providing complimentary beverage service while you wait.
Once again, we sincerely apologize for the inconvenience.`
      },
      ja: {
        sttLang: 'ja-JP', idealWPM: 105,
        checkpoints: ['ご挨拶', '遅延原因', '遅延時間', 'お詫び', '理由説明', '待機のお願い', 'サービス案内', '再度のお詫び'],
        keyPhrases: ['遅延', '点検', '申し訳', '安全', 'ご了承', 'お飲み物'],
        tips: ['心からのお詫びを伝える', '理由と時間を明確に', 'サービスで不便を和らげる'],
        text: `お客様、こんにちは。
ただいま技術的な点検のため、出発が約30分遅延しております。
大変ご迷惑をおかけし、誠に申し訳ございません。
この点検は皆様の安全な運航のために必要不可欠なものでございます。ご理解いただけますようお願いいたします。
追加のご案内があるまで、お座席でお待ちいただけますようお願いいたします。
お待ちの間、お飲み物のサービスをご提供いたします。
重ねてお詫び申し上げます。`
      },
      zh: {
        sttLang: 'zh-CN', idealWPM: 112,
        checkpoints: ['问候语', '延误原因', '延误时间', '道歉', '理由说明', '等待请求', '补偿服务', '再次道歉'],
        keyPhrases: ['延误', '检查', '抱歉', '安全', '理解', '饮料服务'],
        tips: ['真诚的道歉语气', '清楚说明原因和时间', '提供服务表示诚意'],
        text: `各位旅客，您好。
由于技术检查，本次航班出发延误约30分钟。
给您带来不便，我们深感抱歉。
此次检查是为确保飞行安全所必须进行的，请您理解与谅解。
请在座位上等待，直到有进一步通知。
等待期间，我们将为您提供免费饮料服务。
再次为给您带来的不便深表歉意。`
      }
    }
  }
];

// ===== 실제 체크리스트 정의 =====
const CHECKLIST = {
  fluency: {
    label: '유창성', max: 30, color: '#10b981', icon: '💨',
    items: [
      { label: '끊어 읽기',       max: 5,  desc: '의미상 자연스러운 곳에서 적절한 끊어 읽기' },
      { label: '속도 연출',       max: 5,  desc: '전체/어절 간 적절한 속도 연출' },
      { label: '강조 표현',       max: 5,  desc: '의미전달력을 높이기 위한 강조 표현 사용' },
      { label: '문안 숙지',       max: 5,  desc: '문안 숙지 상태 (버벅거림 없음)' },
      { label: '말하는 듯한 연출', max: 10, desc: '읽는 것이 아닌 말하는 듯한 방송 연출' }
    ]
  },
  voice: {
    label: '분위기/목소리', max: 25, color: '#f59e0b', icon: '🎙',
    items: [
      { label: '안정적인 발성', max: 10, desc: '안정적인 발성 유지' },
      { label: '자연스러운 톤', max: 5,  desc: '음성에 어울리는 자연스러운 톤 연출' },
      { label: '친근한 분위기', max: 10, desc: '친근한 분위기 연출' }
    ]
  },
  intonation: {
    label: '억양', max: 25, color: '#8b5cf6', icon: '〰️',
    items: [
      { label: '조사/어미 처리', max: 5,  desc: '(조사/어미)의 자연스러운 처리' },
      { label: '전반적인 억양',  max: 10, desc: '전반적인 자연스러운 억양 구사' },
      { label: '고른 억양',      max: 10, desc: '고른 억양 사용 (단조·과장 없음)' }
    ]
  },
  pronunciation: {
    label: '발음', max: 20, color: '#3b82f6', icon: '🗣',
    items: [
      { label: '정확성', max: 10, desc: '정확성 (자음·모음·받침 등)' },
      { label: '명확성', max: 10, desc: '명확성 (생략·뭉개짐·어미 흐려짐 없음)' }
    ]
  }
};

// ===== STATE =====
let state = {
  currentScript: null,
  selectedLang: 'ko',
  mediaRecorder: null,
  audioContext: null,
  analyser: null,
  sourceNode: null,
  stream: null,
  pitchSamples: [],
  amplitudeSamples: [],
  pauseSamples: [],
  recordingStart: null,
  recordTimerInterval: null,
  prepTimerInterval: null,
  prepTimeLeft: 30,
  transcript: '',
  recognition: null,
  animFrameId: null,
  radarChartInstance: null,
  audioChunks: [],
  _sampleInterval: null
};

// ===== DOM =====
const $ = id => document.getElementById(id);

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  $(id).scrollTop = 0;
}

// ===== BUILTIN OVERRIDES (localStorage) =====
function loadOverrides() {
  try { return JSON.parse(localStorage.getItem('cabinvoice_overrides') || '{}'); }
  catch { return {}; }
}
function saveOverrides(obj) { localStorage.setItem('cabinvoice_overrides', JSON.stringify(obj)); }
function getEffectiveScript(id) {
  const overrides = loadOverrides();
  const base = SCRIPTS.find(s => s.id === id);
  if (!base) return null;
  return overrides[id] ? { ...base, ...overrides[id], langs: { ...base.langs, ...overrides[id].langs } } : base;
}
function restoreBuiltIn(id) {
  const overrides = loadOverrides();
  delete overrides[id];
  saveOverrides(overrides);
  renderHome();
}

// ===== MODAL STATE =====
const _modalState = { mode: 'add', editId: null, editSource: null };

// ===== AUTH =====
const EDIT_PW = 'jmhan2222';
function isEditUnlocked() { return sessionStorage.getItem('cvp_edit_unlocked') === '1'; }
function unlockEdit() { sessionStorage.setItem('cvp_edit_unlocked', '1'); }
let _authCallback = null;
function requireEditAuth(cb) {
  if (isEditUnlocked()) { cb(); return; }
  _authCallback = cb;
  $('auth-pw-input').value = '';
  $('auth-error').classList.add('hidden');
  $('auth-modal').classList.remove('hidden');
  setTimeout(() => $('auth-pw-input').focus(), 60);
}
function _confirmAuth() {
  if ($('auth-pw-input').value === EDIT_PW) {
    unlockEdit();
    $('auth-modal').classList.add('hidden');
    if (_authCallback) { _authCallback(); _authCallback = null; }
  } else {
    $('auth-error').classList.remove('hidden');
    $('auth-pw-input').value = '';
    $('auth-pw-input').focus();
  }
}

// ===== MODEL VOICE (localStorage) =====
let _mvAudioUrl = null; // revocable object URL for current playback
function loadModelVoice(scriptId) {
  return localStorage.getItem(`cabinvoice_voice_${scriptId}`) || null;
}
function saveModelVoice(scriptId, base64) {
  localStorage.setItem(`cabinvoice_voice_${scriptId}`, base64);
}
function deleteModelVoice(scriptId) {
  localStorage.removeItem(`cabinvoice_voice_${scriptId}`);
}
function getModelVoiceKey() {
  // During edit: use existing id. During add: use pending key resolved at save time.
  return _modalState.mode === 'edit' ? `cabinvoice_voice_${_modalState.editId}` : 'cabinvoice_voice__pending';
}
function _refreshMvUI() {
  const key = getModelVoiceKey();
  const stored = localStorage.getItem(key);
  const name = stored ? (stored.split(',')[0].includes('audio') ? '음성 파일 등록됨' : '모델 음성 등록됨') : '';
  const hasMv = !!stored;
  $('mv-current').classList.toggle('hidden', !hasMv);
  $('mv-name').textContent = hasMv ? (localStorage.getItem(key + '_name') || '모델 음성 등록됨') : '';
}

// ===== HTML ESCAPING & SCRIPT TEXT RENDERING =====
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function renderScriptText(text) {
  const lines = text.split('\n');
  let html = '';
  let tableRows = [];
  const flushTable = () => {
    if (!tableRows.length) return;
    let t = '<table class="script-table"><thead><tr>';
    t += tableRows[0].map(c=>`<th>${escHtml(c)}</th>`).join('');
    t += '</tr></thead><tbody>';
    for (let i = 1; i < tableRows.length; i++) {
      t += '<tr>' + tableRows[i].map(c=>`<td>${escHtml(c)}</td>`).join('') + '</tr>';
    }
    t += '</tbody></table>';
    html += t;
    tableRows = [];
  };
  for (const line of lines) {
    const tr = line.trim();
    if (/^\|.+\|$/.test(tr)) {
      if (/^\|[\s\-|:]+\|$/.test(tr)) continue; // markdown separator
      tableRows.push(tr.slice(1,-1).split('|').map(c=>c.trim()));
    } else {
      flushTable();
      html += escHtml(line) + '\n';
    }
  }
  flushTable();
  return `<div class="script-text-rendered">${html}</div>`;
}

// ===== CUSTOM SCRIPTS (localStorage) =====
function loadCustomScripts() {
  try { return JSON.parse(localStorage.getItem('cabinvoice_custom_scripts') || '[]'); }
  catch { return []; }
}
function saveCustomScripts(arr) {
  localStorage.setItem('cabinvoice_custom_scripts', JSON.stringify(arr));
}
function deleteCustomScript(id) {
  const arr = loadCustomScripts().filter(s => s.id !== id);
  saveCustomScripts(arr);
  renderHome();
}
function extractKeyPhrases(text, lang) {
  const stopKo = new Set(['그리고','하지만','또한','이제','잠시','이후','때까지','위해','대해','것을','있는','있습니다','합니다','주시기','바랍니다','하여','되었습니다','드리겠습니다','주세요','감사합니다','안녕하십니까','승객여러분','저희','현재','대한']);
  const words = text.replace(/[.,!?。、·\n]/g,' ').split(/\s+/).filter(w => w.length >= (lang==='ko'?2:4) && !stopKo.has(w));
  const result = [];
  const step = Math.max(1, Math.floor(words.length / 6));
  for (let i = 0; i < words.length && result.length < 6; i += step) result.push(words[i]);
  return result.length ? result : ['방송'];
}
function buildCustomLang(text, cpStr, langCode) {
  const sttMap = { ko:'ko-KR', en:'en-US', ja:'ja-JP', zh:'zh-CN' };
  const wpmMap = { ko:130, en:140, ja:110, zh:118 };
  const checkpoints = cpStr ? cpStr.split(',').map(s=>s.trim()).filter(Boolean) : [];
  return {
    sttLang: sttMap[langCode] || 'ko-KR',
    idealWPM: wpmMap[langCode] || 130,
    text: text.trim(),
    checkpoints: checkpoints.length ? checkpoints : ['방송 내용'],
    keyPhrases: extractKeyPhrases(text, langCode),
    tips: ['실제 방송문으로 연습합니다', '밝고 명확한 목소리로', '방송문을 충분히 숙지한 후 시작하세요']
  };
}

// ===== HOME =====
function renderHome() {
  const grid = $('script-grid');
  const customScripts = loadCustomScripts();
  const overrides = loadOverrides();

  const builtInHTML = SCRIPTS.map(s => {
    const eff = getEffectiveScript(s.id);
    const isModified = !!overrides[s.id];
    return `
    <div class="script-card-item ${eff.colorClass}" data-id="${s.id}" data-source="builtin" style="position:relative">
      <button class="scard-edit" data-edit="${s.id}" data-source="builtin" title="편집">✏️ 편집</button>
      <div class="scard-top">
        <span class="scard-icon">${eff.icon}</span>
        <span class="scard-diff ${eff.difficultyClass}">${eff.difficulty}</span>
      </div>
      ${isModified ? '<div class="scard-custom-badge" style="background:#fef3c7;color:#92400e">수정됨</div>' : ''}
      <div class="scard-title">${eff.title}</div>
      <div class="scard-meta">
        <span>🇰🇷 한 &nbsp;🇺🇸 EN &nbsp;🇯🇵 日 &nbsp;🇨🇳 中</span>
        <span>✅ ${eff.langs.ko.checkpoints.length}개 체크포인트</span>
      </div>
    </div>`;
  }).join('');

  const customHTML = customScripts.map(s => {
    const langBadges = Object.keys(s.langs).map(l => ({'ko':'🇰🇷','en':'🇺🇸','ja':'🇯🇵','zh':'🇨🇳'}[l]||'')).join(' ');
    const cp = s.langs.ko?.checkpoints?.length || 0;
    return `
    <div class="script-card-item c-blue has-delete" data-id="${s.id}" data-source="custom" style="position:relative">
      <button class="scard-edit" data-edit="${s.id}" data-source="custom" title="편집">✏️ 편집</button>
      <button class="scard-delete" data-delete="${s.id}" title="삭제">✕ 삭제</button>
      <div class="scard-top">
        <span class="scard-icon">${s.icon}</span>
        <span class="scard-diff ${s.difficultyClass}">${s.difficulty}</span>
      </div>
      <div class="scard-custom-badge">내 방송문</div>
      <div class="scard-title">${s.title}</div>
      <div class="scard-meta">
        <span>${langBadges}</span>
        ${cp ? `<span>✅ ${cp}개 체크포인트</span>` : ''}
      </div>
    </div>`;
  }).join('');

  const clearBtnHTML = customScripts.length
    ? `<div class="script-card-add card-danger" id="btn-clear-custom">
        <div class="script-card-add-icon">🗑</div>
        <div class="script-card-add-label">내 방송문 전체 삭제</div>
        <div class="script-card-add-sub">등록된 내 방송문<br>${customScripts.length}개를 모두 삭제합니다</div>
       </div>` : '';

  const actionCardsHTML = `
    <div class="script-card-add" id="btn-add-custom">
      <div class="script-card-add-icon">＋</div>
      <div class="script-card-add-label">직접 입력</div>
      <div class="script-card-add-sub">방송문안을 직접 입력하여<br>연습할 수 있습니다</div>
    </div>
    <div class="script-card-add" id="btn-import-pdf">
      <div class="script-card-add-icon">📄</div>
      <div class="script-card-add-label">PDF 가져오기</div>
      <div class="script-card-add-sub">방송교범 PDF를 분석하여<br>자동으로 등록합니다</div>
    </div>
    ${clearBtnHTML}`;

  grid.innerHTML = builtInHTML + customHTML + actionCardsHTML;

  // built-in: 카드 클릭 → 연습 (편집 버튼 제외)
  grid.querySelectorAll('[data-source="builtin"]').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('[data-edit]')) return;
      startPrep(getEffectiveScript(card.dataset.id));
    });
  });

  // custom: 카드 클릭 → 연습 (버튼 제외)
  grid.querySelectorAll('[data-source="custom"]').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('[data-edit]') || e.target.closest('[data-delete]')) return;
      const s = loadCustomScripts().find(s => s.id === card.dataset.id);
      if (s) startPrep(s);
    });
  });

  // 편집 버튼 (관리자 인증 필요)
  grid.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      requireEditAuth(() => openEditModal(btn.dataset.edit, btn.dataset.source));
    });
  });

  // 삭제 버튼 (관리자 인증 필요)
  grid.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      requireEditAuth(() => {
        const title = btn.closest('[data-source]').querySelector('.scard-title').textContent;
        if (confirm(`"${title}" 방송문을 삭제하시겠습니까?`)) deleteCustomScript(btn.dataset.delete);
      });
    });
  });

  $('btn-add-custom').addEventListener('click', () => requireEditAuth(openAddModal));
  $('btn-import-pdf').addEventListener('click', () => requireEditAuth(openPdfModal));
  document.getElementById('btn-clear-custom')?.addEventListener('click', () => {
    requireEditAuth(() => {
      const n = loadCustomScripts().length;
      if (confirm(`내 방송문 ${n}개를 모두 삭제하시겠습니까?\n(기본 제공 방송문은 삭제되지 않습니다)`)) {
        saveCustomScripts([]);
        renderHome();
      }
    });
  });
}

// ===== PREP =====
function startPrep(script) {
  state.currentScript = script;
  clearInterval(state.prepTimerInterval);
  updatePrepContent();
  showScreen('screen-prep');
  startPrepTimer();
}

function updatePrepContent() {
  const s = state.currentScript;

  // 언어 탭: 해당 언어 데이터가 없으면 탭 비활성화
  $('lang-tabs').querySelectorAll('.lang-tab').forEach(tab => {
    const hasLang = s.langs[tab.dataset.lang] && s.langs[tab.dataset.lang].text;
    tab.style.opacity = hasLang ? '' : '0.35';
    tab.style.pointerEvents = hasLang ? '' : 'none';
  });
  // 선택된 언어가 없으면 첫 번째 available 언어로 fallback
  if (!s.langs[state.selectedLang] || !s.langs[state.selectedLang].text) {
    state.selectedLang = Object.keys(s.langs).find(l => s.langs[l].text) || 'ko';
    $('lang-tabs').querySelectorAll('.lang-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.lang === state.selectedLang);
    });
  }

  const lang = s.langs[state.selectedLang];

  $('prep-category-tag').textContent = { ko:'한국어', en:'English', ja:'日本語', zh:'中文' }[state.selectedLang];
  $('prep-difficulty-tag').textContent = s.difficulty;
  $('prep-duration-tag').textContent = { ko:'약 40초', en:'approx. 40s', ja:'約40秒', zh:'约40秒' }[state.selectedLang] || '약 40초';
  $('prep-title').textContent = s.title;
  $('prep-text').innerHTML = renderScriptText(lang.text);
  // 모델 음성 바
  const hasVoice = !!loadModelVoice(s.id);
  $('model-voice-bar').classList.toggle('hidden', !hasVoice);

  $('prep-checkpoints').innerHTML = lang.checkpoints.map(c =>
    `<span class="checkpoint-item">✓ ${c}</span>`).join('');

  $('tips-box').innerHTML = `
    <div class="tips-box-label">💡 연습 팁</div>
    ${lang.tips.map(t => `<div class="tip-item">${t}</div>`).join('')}`;
}

function startPrepTimer() {
  state.prepTimeLeft = 30;
  $('prep-countdown').textContent = 30;
  $('prep-countdown').classList.remove('urgent');
  state.prepTimerInterval = setInterval(() => {
    state.prepTimeLeft--;
    $('prep-countdown').textContent = state.prepTimeLeft;
    if (state.prepTimeLeft <= 10) $('prep-countdown').classList.add('urgent');
    if (state.prepTimeLeft <= 0) clearInterval(state.prepTimerInterval);
  }, 1000);
}

// ===== RECORDING =====
async function startRecording() {
  clearInterval(state.prepTimerInterval);
  const lang = state.currentScript.langs[state.selectedLang];

  state.transcript = '';
  state.pitchSamples = [];
  state.amplitudeSamples = [];
  state.pauseSamples = [];
  state.audioChunks = [];
  state.recordingStart = Date.now();

  $('record-title').textContent = `${state.currentScript.title} · ${{ ko:'한국어', en:'English', ja:'日本語', zh:'中文' }[state.selectedLang]}`;
  $('record-timer').textContent = '00:00';
  $('live-text').textContent = '말씀해 주세요...';
  $('script-peek-text').innerHTML = renderScriptText(lang.text);
  $('script-peek-text').classList.add('hidden');
  showScreen('screen-record');

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 44100, channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  } catch (e) {
    alert('마이크 접근 권한이 필요합니다.');
    showScreen('screen-prep');
    return;
  }

  state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  state.analyser = state.audioContext.createAnalyser();
  state.analyser.fftSize = 4096;
  state.analyser.smoothingTimeConstant = 0.6;
  state.sourceNode = state.audioContext.createMediaStreamSource(state.stream);
  state.sourceNode.connect(state.analyser);

  state.mediaRecorder = new MediaRecorder(state.stream);
  state.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) state.audioChunks.push(e.data); };
  state.mediaRecorder.start(100);

  drawWaveform();
  startAudioSampling();

  state.recordTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.recordingStart) / 1000);
    $('record-timer').textContent = `${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`;
  }, 500);

  setupSpeechRecognition(lang.sttLang);
}

function drawWaveform() {
  const canvas = $('waveform-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.offsetWidth || 800;
  const H = canvas.height = 140;
  const bufLen = state.analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufLen);

  function draw() {
    state.animFrameId = requestAnimationFrame(draw);
    state.analyser.getByteTimeDomainData(dataArray);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(59,130,246,.12)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#3b82f6'); grad.addColorStop(0.5, '#8b5cf6'); grad.addColorStop(1, '#3b82f6');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 8; ctx.shadowColor = '#3b82f6';
    ctx.beginPath();
    const sliceW = W / bufLen;
    let x = 0;
    for (let i = 0; i < bufLen; i++) {
      const y = ((dataArray[i] / 128.0) - 1) * H * 0.42 + H / 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      x += sliceW;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  draw();
}

function startAudioSampling() {
  const floatBuf = new Float32Array(state.analyser.fftSize);
  const freqBuf  = new Uint8Array(state.analyser.frequencyBinCount);
  const SILENCE_THRESH = 0.015;

  state._sampleInterval = setInterval(() => {
    if (!state.mediaRecorder || state.mediaRecorder.state !== 'recording') return;

    state.analyser.getFloatTimeDomainData(floatBuf);
    state.analyser.getByteFrequencyData(freqBuf);

    // RMS amplitude
    let sumSq = 0;
    for (let i = 0; i < floatBuf.length; i++) sumSq += floatBuf[i] * floatBuf[i];
    const rms = Math.sqrt(sumSq / floatBuf.length);
    state.amplitudeSamples.push(rms);

    // Silence flag for pause detection
    state.pauseSamples.push(rms < SILENCE_THRESH ? 0 : 1);

    // Pitch: autocorrelation on float data
    if (rms > SILENCE_THRESH) {
      const pitch = autoCorrelationPitch(floatBuf, state.audioContext.sampleRate);
      if (pitch > 75 && pitch < 520) state.pitchSamples.push(pitch);
    }
  }, 100);
}

// 자기상관 피치 검출 (FFT 피크보다 정밀)
function autoCorrelationPitch(buf, sampleRate) {
  const n = 1024; // 분석 구간 (성능 최적화)
  const minP = Math.floor(sampleRate / 520);
  const maxP = Math.floor(sampleRate / 75);
  let bestCorr = -1, bestPeriod = 0;

  for (let p = minP; p <= maxP; p++) {
    let corr = 0;
    for (let i = 0; i < n - p; i++) corr += buf[i] * buf[i + p];
    corr /= (n - p);
    if (corr > bestCorr) { bestCorr = corr; bestPeriod = p; }
  }
  return bestPeriod > 0 ? sampleRate / bestPeriod : 0;
}

function setupSpeechRecognition(langCode) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { $('live-text').textContent = '⚠️ Chrome 브라우저에서만 음성 인식이 지원됩니다.'; return; }

  const recog = new SR();
  recog.lang = langCode;
  recog.continuous = true;
  recog.interimResults = true;

  recog.onresult = e => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      e.results[i].isFinal ? (state.transcript += t + ' ') : (interim = t);
    }
    $('live-text').textContent = (state.transcript + interim).trim() || '말씀해 주세요...';
  };
  recog.onerror = e => { if (e.error !== 'no-speech' && e.error !== 'aborted') console.warn('STT:', e.error); };
  recog.onend = () => { if (state.mediaRecorder?.state === 'recording') { try { recog.start(); } catch(e){} } };
  try { recog.start(); } catch(e){}
  state.recognition = recog;
}

function stopRecording() {
  clearInterval(state.recordTimerInterval);
  clearInterval(state._sampleInterval);
  cancelAnimationFrame(state.animFrameId);
  try { state.recognition?.abort(); } catch(e){}
  state.recognition = null;
  if (state.mediaRecorder?.state !== 'inactive') state.mediaRecorder.stop();
  state.stream?.getTracks().forEach(t => t.stop());
  if (state.audioContext) { state.audioContext.close(); state.audioContext = null; }

  const duration = (Date.now() - state.recordingStart) / 1000;
  $('loading-overlay').classList.remove('hidden');
  setTimeout(() => analyzeAndShow(duration), 1800);
}

// ===== 엄격한 3단계 배점 =====
// ratio=0 → 0점, 이하 선형 증가, 기준: 부족<0.40, 보통<0.78, 우수≥0.78
function tierScore(ratio, maxPt) {
  if (!ratio || ratio <= 0) return 0;
  ratio = Math.min(1, Math.max(0, ratio));
  if (ratio >= 0.82) return maxPt;
  if (ratio >= 0.55) {
    // 보통 구간: 10pt→6~9, 5pt→3~4
    if (maxPt === 10) return Math.round(6 + (ratio - 0.55) / 0.27 * 3);
    if (maxPt === 5)  return Math.round(3 + (ratio - 0.55) / 0.27);
  }
  if (ratio >= 0.30) {
    // 부족 구간: 10pt→2~6, 5pt→1~3
    if (maxPt === 10) return Math.round(2 + (ratio - 0.30) / 0.25 * 4);
    if (maxPt === 5)  return Math.round(1 + (ratio - 0.30) / 0.25 * 2);
  }
  // 매우 부족: 최소 0~2
  if (maxPt === 10) return Math.round(ratio / 0.30 * 2);
  if (maxPt === 5)  return Math.round(ratio / 0.30);
  return 0;
}

// ===== ANALYSIS =====
function analyzeAndShow(duration) {
  const s = state.currentScript;
  const lang = s.langs[state.selectedLang];
  const transcript = state.transcript.trim();
  const hasSpeech = transcript.length > 5;
  const hasAudio  = state.pitchSamples.length >= 8 && state.amplitudeSamples.length >= 10;

  // --- 내용 측정 (문안 일치) ---
  const wordMatch    = hasSpeech ? measureWordMatch(transcript, lang.text) : 0;
  const completeness = hasSpeech ? measureCompleteness(transcript, lang.keyPhrases) : 0;

  // ── 내용 일치율 게이트 (cG) ──────────────────────────────────────────────
  // 방송문과 얼마나 일치했는지를 0~1로 나타낸 값.
  // 이 값이 낮으면 음성 신호 기반 점수(강조·억양·발성 등)도 비례해서 낮아짐.
  // → "아~" 한 마디처럼 내용이 전혀 없을 때 음성 품질만으로 좋은 점수가 나오는
  //   오류를 방지한다.
  const contentQuality = Math.min(1, wordMatch * 0.55 + completeness * 0.45);
  // 15% 미만이면 신호가 아닌 노이즈로 간주 → 음성 기반 지표 전부 0
  const cG = contentQuality >= 0.15 ? contentQuality : 0;
  // ─────────────────────────────────────────────────────────────────────────

  // --- 음성 신호 측정 ---
  const wpm        = hasSpeech && duration > 3 ? (transcript.split(' ').filter(Boolean).length / duration) * 60 : 0;
  const wpmRatio   = wpm > 0 ? Math.max(0, 1 - Math.abs(wpm - lang.idealWPM) / 70) : 0;
  const pitchCV    = hasAudio ? measurePitchCV(state.pitchSamples) : 0;
  const pitchRange = hasAudio ? measurePitchRange(state.pitchSamples) : 0;
  const ampStab    = hasAudio ? measureAmpStability(state.amplitudeSamples) : 0;
  const ampPeaks   = hasAudio ? measureAmpPeaks(state.amplitudeSamples) : 0;
  const meanPitch  = hasAudio ? state.pitchSamples.reduce((a,b)=>a+b,0)/state.pitchSamples.length : 0;
  const pauseRatio = state.pauseSamples.length > 0 ? state.pauseSamples.filter(v=>v===0).length / state.pauseSamples.length : 0;
  const naturalPause = pauseRatio >= 0.05 && pauseRatio <= 0.35 ? 1 - Math.abs(pauseRatio - 0.20) / 0.20 : 0;

  // 피치 대역 (150-300 Hz 여성, 100-200 Hz 남성)
  const pitchWarmth = meanPitch > 0
    ? (meanPitch >= 130 && meanPitch <= 320 ? Math.max(0, 1 - Math.abs(meanPitch - 225) / 95) : 0.1)
    : 0;

  // 억양 CV 정규화 (이상 CV: 0.05~0.20)
  const intonationCV = pitchCV > 0
    ? (pitchCV >= 0.05 && pitchCV <= 0.20
        ? 0.65 + (pitchCV - 0.05) / 0.15 * 0.35
        : pitchCV < 0.05 ? pitchCV / 0.05 * 0.65
        : Math.max(0.1, 1 - (pitchCV - 0.20) * 2.5))
    : 0;

  // ── cG 적용: 내용 일치율이 낮으면 음성 신호 지표도 낮아짐 ──────────────
  const gAmpPeaks    = ampPeaks    * cG;   // 강조: 내용 없이 진폭 피크만으론 안 됨
  const gAmpStab     = ampStab     * (0.4 + 0.6 * cG); // 발성: 기본 40%는 신호 반영
  const gPitchWarmth = pitchWarmth * cG;   // 목소리 톤: 내용 없이 판단 불가
  const gIntonCV     = intonationCV * cG;  // 억양 CV: 내용 없이 판단 불가
  const gPitchRange  = pitchRange  * cG;   // 억양 범위: 내용 없이 판단 불가
  // ─────────────────────────────────────────────────────────────────────────

  // ---- 유창성 (30점) ----
  const fluencyItems = [
    tierScore(Math.min(1, naturalPause * 0.5 + completeness * 0.5), 5),                        // 끊어읽기
    tierScore(wpmRatio * (cG >= 0.3 ? 1 : cG / 0.3), 5),                                      // 속도
    tierScore(gAmpPeaks, 5),                                                                    // 강조
    tierScore(completeness * 0.7 + wordMatch * 0.3, 5),                                        // 문안 숙지
    tierScore(Math.min(1, wpmRatio * 0.3 + gIntonCV * 0.4 + gAmpStab * 0.3), 10)             // 말하는 듯한 연출
  ];

  // ---- 분위기/목소리 (25점) ----
  const voiceItems = [
    tierScore(gAmpStab, 10),                                                                    // 안정적인 발성
    tierScore(Math.min(1, gPitchWarmth * 0.5 + gAmpStab * 0.5), 5),                           // 자연스러운 톤
    tierScore(Math.min(1, gPitchWarmth * 0.55 + gIntonCV * 0.25 + gAmpStab * 0.20), 10)      // 친근한 분위기
  ];

  // ---- 억양 (25점) ----
  const intonationItems = [
    tierScore(Math.min(1, gIntonCV * 0.6 + wpmRatio * 0.4), 5),                               // 조사/어미 처리
    tierScore(gPitchRange, 10),                                                                  // 전반적인 억양
    tierScore(gIntonCV, 10)                                                                      // 고른 억양
  ];

  // ---- 발음 (20점) ----
  const pronunciationItems = [
    tierScore(wordMatch, 10),                                                                    // 정확성
    tierScore(Math.min(1, wordMatch * 0.55 + completeness * 0.45), 10)                         // 명확성
  ];

  const total =
    fluencyItems.reduce((a,b)=>a+b,0) +
    voiceItems.reduce((a,b)=>a+b,0) +
    intonationItems.reduce((a,b)=>a+b,0) +
    pronunciationItems.reduce((a,b)=>a+b,0);

  const result = {
    total, pass: total >= 85,
    wpm: Math.round(wpm), duration,
    wordMatch, completeness, contentQuality,
    categories: {
      fluency:       { score: fluencyItems.reduce((a,b)=>a+b,0),       max: 30, items: fluencyItems },
      voice:         { score: voiceItems.reduce((a,b)=>a+b,0),         max: 25, items: voiceItems },
      intonation:    { score: intonationItems.reduce((a,b)=>a+b,0),    max: 25, items: intonationItems },
      pronunciation: { score: pronunciationItems.reduce((a,b)=>a+b,0), max: 20, items: pronunciationItems }
    }
  };

  $('loading-overlay').classList.add('hidden');
  showResults(result, transcript);
}

// ===== 측정 함수 (엄격) =====
function measureWordMatch(transcript, script) {
  const tW = normalize(transcript).split(' ').filter(Boolean);
  const sW = normalize(script).split(' ').filter(Boolean);
  if (!tW.length || !sW.length) return 0;
  let matches = 0; const used = new Set();
  for (const tw of tW) {
    for (let i = 0; i < sW.length; i++) {
      if (!used.has(i) && similarity(tw, sW[i]) > 0.72) { matches++; used.add(i); break; }
    }
  }
  const prec = matches / tW.length, rec = matches / sW.length;
  return prec + rec > 0 ? 2 * prec * rec / (prec + rec) : 0;
}

function measureCompleteness(transcript, keyPhrases) {
  const norm = normalize(transcript);
  let found = 0;
  for (const phrase of keyPhrases) {
    const np = normalize(phrase);
    if (norm.includes(np)) { found++; continue; }
    if (np.split(' ').some(w => w.length > 1 && norm.includes(w))) found += 0.6;
  }
  return Math.min(1, found / keyPhrases.length);
}

function measurePitchCV(samples) {
  if (samples.length < 8) return 0;
  const mean = samples.reduce((a,b)=>a+b,0) / samples.length;
  const variance = samples.reduce((a,b)=>a+(b-mean)**2,0) / samples.length;
  return mean > 0 ? Math.sqrt(variance) / mean : 0;
}

function measurePitchRange(samples) {
  if (samples.length < 8) return 0;
  const sorted = [...samples].sort((a,b)=>a-b);
  const p10 = sorted[Math.floor(samples.length*0.10)];
  const p90 = sorted[Math.floor(samples.length*0.90)];
  if (p10 === 0) return 0;
  const range = (p90 - p10) / p10;
  if (range >= 0.20 && range <= 0.80) return 0.65 + (range - 0.20) / 0.60 * 0.35;
  if (range < 0.20) return range / 0.20 * 0.65;
  return Math.max(0.1, 1 - (range - 0.80) * 0.6);
}

function measureAmpStability(samples) {
  if (samples.length < 10) return 0;
  const speaking = samples.filter(v => v > 0.018);
  if (speaking.length < 5) return 0;
  const mean = speaking.reduce((a,b)=>a+b,0) / speaking.length;
  if (mean === 0) return 0;
  const cv = Math.sqrt(speaking.reduce((a,b)=>a+(b-mean)**2,0)/speaking.length) / mean;
  return Math.max(0, Math.min(1, 1 - cv * 1.4));
}

function measureAmpPeaks(samples) {
  if (samples.length < 15) return 0;
  const mean = samples.reduce((a,b)=>a+b,0) / samples.length;
  if (mean < 0.005) return 0;
  const thresh = mean * 1.55;
  let peaks = 0;
  for (let i = 1; i < samples.length-1; i++) {
    if (samples[i] > thresh && samples[i] >= samples[i-1] && samples[i] >= samples[i+1]) peaks++;
  }
  const rate = peaks / (samples.length / 10);
  if (rate >= 0.4 && rate <= 2.2) return 0.65 + (rate / 2.2) * 0.35;
  if (rate < 0.4) return rate / 0.4 * 0.65;
  return Math.max(0.1, 1 - (rate - 2.2) * 0.2);
}

// ===== RESULTS =====
function showResults(result, transcript) {
  showScreen('screen-result');
  const lang = state.currentScript.langs[state.selectedLang];

  $('total-score-value').textContent = result.total;
  const gradeEl = $('total-grade');
  gradeEl.textContent = result.pass ? 'PASS ✓' : 'FAIL ✗';
  gradeEl.className   = `total-grade ${result.pass ? 'grade-A' : 'grade-D'}`;

  renderRadar(result);

  const barsEl = $('score-bars');
  barsEl.innerHTML = Object.entries(CHECKLIST).map(([key, cat]) => {
    const cr = result.categories[key];
    const pct = Math.round(cr.score / cat.max * 100);
    const itemsHTML = cat.items.map((item, i) => {
      const got = cr.items[i];
      const tier = got >= item.max ? '우수' : got >= (item.max === 10 ? 6 : 3) ? '보통' : '부족';
      const tc   = got >= item.max ? 'tier-good' : got >= (item.max === 10 ? 6 : 3) ? 'tier-mid' : 'tier-low';
      return `<div class="sub-item">
        <div class="sub-item-name">${item.label}</div>
        <div class="sub-item-right">
          <span class="sub-tier ${tc}">${tier}</span>
          <span class="sub-score">${got}<span class="sub-max">/${item.max}</span></span>
        </div>
      </div>`;
    }).join('');
    return `<div class="score-cat-block">
      <div class="score-bar-header">
        <div class="score-bar-name">${cat.icon} ${cat.label}</div>
        <div class="score-bar-val" style="color:${cat.color}">${cr.score}<span style="font-size:12px;color:#94a3b8">/${cat.max}</span></div>
      </div>
      <div class="score-bar-track">
        <div class="score-bar-fill" style="width:0%;background:${cat.color}" data-target="${pct}"></div>
      </div>
      <div class="sub-items">${itemsHTML}</div>
    </div>`;
  }).join('');

  requestAnimationFrame(() => {
    barsEl.querySelectorAll('.score-bar-fill').forEach(el => { el.style.width = el.dataset.target + '%'; });
  });

  renderFeedback(result, transcript, lang);
  renderTranscriptCompare(transcript, lang);
}

function renderRadar(result) {
  if (state.radarChartInstance) { state.radarChartInstance.destroy(); state.radarChartInstance = null; }
  const cats = Object.entries(CHECKLIST);
  const myData = cats.map(([k,c]) => Math.round(result.categories[k].score / c.max * 100));
  const ctx = $('radar-chart').getContext('2d');
  state.radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: cats.map(([,c]) => `${c.label}(${c.max}점)`),
      datasets: [
        {
          label: '내 점수(%)',
          data: myData,
          backgroundColor: result.pass ? 'rgba(59,130,246,.18)' : 'rgba(239,68,68,.15)',
          borderColor: result.pass ? '#3b82f6' : '#ef4444',
          borderWidth: 2.5, pointBackgroundColor: result.pass ? '#3b82f6' : '#ef4444', pointRadius: 4
        },
        {
          label: 'PASS 기준(85%)',
          data: [85,85,85,85],
          backgroundColor: 'rgba(16,185,129,.05)',
          borderColor: 'rgba(16,185,129,.55)',
          borderWidth: 1.5, borderDash: [5,4],
          pointRadius: 2, pointBackgroundColor: '#10b981'
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true, min: 0, max: 100,
          ticks: { display: false, stepSize: 25 },
          grid: { color: 'rgba(0,0,0,.07)' },
          pointLabels: { font: { size: 10, weight: '600' }, color: '#475569' }
        }
      },
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } }
      }
    }
  });
}

function renderFeedback(result, transcript, lang) {
  const cats = result.categories;

  /* ── 카테고리별 개선 팁 정의 ──
     cq = content quality (0~1). 음성·억양 기반 팁은 방송 내용이 충분히 인식됐을 때만 유효.
     cq < 0.3 이면 행동 관련 팁 대신 "내용 인식 부족" 안내를 표시한다. */
  const cq = result.contentQuality ?? 0;
  const cqOk  = cq >= 0.30;  // 음성 분석 팁이 의미 있는 최소 임계값
  const cqFull= cq >= 0.50;  // 연출·억양 팁이 신뢰도 높은 임계값

  const CAT_TIPS = {
    fluency: [
      // 끊어 읽기 — 내용이 어느 정도 인식된 경우에만
      (v) => (v < 4 && cqOk) ? '의미 단위로 자연스럽게 끊어 읽는 연습을 하세요.' : null,
      // 속도 연출
      (v) => (v < 4 && cqOk) ? (result.wpm > 0
        ? `현재 ${result.wpm} WPM — 적정 ${lang.idealWPM} WPM. ${result.wpm > lang.idealWPM ? '조금 더 천천히' : '조금 더 빠르게'} 말해보세요.`
        : '125–140 WPM의 적절한 속도로 연습하세요.') : null,
      // 강조 표현
      (v) => (v < 3 && cqFull) ? '목적지·편명·시간 등 핵심 정보에서 적절한 강세를 넣어 보세요.' : null,
      // 문안 숙지 — contentQuality 자체가 낮으면 직접 내용 부족 언급
      (v) => v < 3 ? (cqOk
        ? '버벅거림이 감지됐습니다. 방송문을 완전히 숙지한 후 다시 시도하세요.'
        : '방송문 내용이 충분히 인식되지 않았습니다. 방송문 전체를 또렷하게 읽어 보세요.') : null,
      // 말하는 듯한 연출 — 충분한 내용이 있어야 억양·강세 패턴을 판단할 수 있음
      (v) => (v < 7 && cqFull) ? '억양 변화와 강세 패턴이 단조롭습니다. 특정 단어에 강세를 주고 문장 끝 처리를 다양하게 연습하세요.' : null,
    ],
    voice: [
      // 안정적인 발성 — 충분한 발화 없이는 판단 불가
      (v) => (v < 6 && cqOk) ? '복식호흡 후 안정적인 발성으로 시작하세요.' : null,
      (v) => (v < 4 && cqOk) ? '자신의 목소리에 어울리는 자연스러운 톤을 찾아보세요.' : null,
      (v) => (v < 6 && cqFull) ? '미소를 지으며 방송하면 목소리에서 따뜻함이 자연스럽게 전달됩니다.' : null,
    ],
    intonation: [
      // 억양은 충분한 발화가 있어야 의미 있음
      (v) => (v < 3 && cqOk) ? '"~습니다", "~주시기 바랍니다" 등 문장 끝을 흐리지 않고 명확하게 마무리하세요.' : null,
      (v) => (v < 6 && cqFull) ? '피치 변화 폭이 좁습니다. 문장마다 자연스러운 굴곡을 넣어 생동감 있게 말하세요.' : null,
      (v) => (v < 6 && cqFull) ? '억양 기복이 고르지 않습니다. 전체적으로 일정한 흐름을 유지하세요.' : null,
    ],
    pronunciation: [
      (v) => v < 5 ? `핵심 단어(${lang.keyPhrases.slice(0,4).join(', ')})를 입을 크게 벌려 또렷하게 발음하세요.` : null,
      (v) => v < 5 ? '받침·어미가 흐려지는 경향이 있습니다. 각 음절을 끝까지 분명하게 발음하세요.' : null,
    ],
  };

  /* ── 1. 종합 판정 배너 ── */
  const isExcellent = result.total >= 95;
  const overviewCls = isExcellent ? 'ov-excellent' : result.pass ? 'ov-pass' : 'ov-fail';
  const overviewIcon = isExcellent ? '🏆' : result.pass ? '✅' : '❌';
  const overviewLabel = isExcellent ? '최우수' : result.pass ? 'PASS' : 'FAIL';
  const overviewMsg = isExcellent
    ? '모든 항목 탁월 — 이 실력을 실전에서도 유지하세요!'
    : result.pass
    ? '합격 기준(85점) 통과. 아래 개선사항으로 완성도를 더 높여보세요.'
    : `합격까지 ${85 - result.total}점 부족. 아래 카테고리를 집중 연습하세요.`;

  const noSpeech = (!transcript || transcript.length < 5)
    ? `<div class="fb-no-speech">⚠️ 음성이 인식되지 않았습니다 — Chrome 브라우저 + 마이크 허용 필요. 발음·완성도 점수가 0점 처리됩니다.</div>`
    : (cq < 0.20 && transcript && transcript.length >= 5)
    ? `<div class="fb-no-speech fb-low-content">⚠️ 방송문 내용 일치율이 낮아(${Math.round(cq*100)}%) 음성·억양 분석의 신뢰도가 제한됩니다. 방송문 전체를 또렷하게 읽은 후 다시 시도하세요.</div>`
    : '';

  const overviewHTML = `
  <div class="fb-overview ${overviewCls}">
    <div class="fb-ov-left">
      <div class="fb-ov-score">${result.total}</div>
      <div class="fb-ov-badge">${overviewIcon} ${overviewLabel}</div>
    </div>
    <div class="fb-ov-right">
      <div class="fb-ov-msg">${overviewMsg}</div>
      <div class="fb-ov-stats">
        <span class="fb-stat">⏱ ${Math.round(result.duration)}초</span>
        <span class="fb-stat">💬 ${result.wpm} WPM</span>
        <span class="fb-stat">🔑 키워드 ${Math.round(result.completeness * 100)}%</span>
        <span class="fb-stat">📝 단어일치 ${Math.round(result.wordMatch * 100)}%</span>
      </div>
    </div>
  </div>${noSpeech}`;

  /* ── 2. 카테고리별 섹션 ── */
  const groupsHTML = ['fluency','voice','intonation','pronunciation'].map(key => {
    const cat  = CHECKLIST[key];
    const cr   = cats[key];
    const pct  = Math.round(cr.score / cat.max * 100);
    const grade = pct >= 87 ? 'good' : pct >= 60 ? 'mid' : 'low';
    const gradeLabel = pct >= 87 ? '우수' : pct >= 60 ? '보통' : '부족';
    const tips = CAT_TIPS[key];

    const subRows = cat.items.map((item, i) => {
      const got   = cr.items[i];
      const ratio = got / item.max;
      const iGood = ratio >= 0.87;
      const iMid  = ratio >= 0.60;
      const rowCls = iGood ? 'sr-good' : iMid ? 'sr-mid' : 'sr-low';
      const tagCls = iGood ? 'tag-good' : iMid ? 'tag-mid' : 'tag-low';
      const icon   = iGood ? '✓' : iMid ? '△' : '✕';
      const label  = iGood ? '우수' : iMid ? '보통' : '부족';
      const tip    = tips[i]?.(got);

      return `
      <div class="fb-sub-row ${rowCls}">
        <div class="fb-sub-main">
          <span class="fb-sub-icon">${icon}</span>
          <span class="fb-sub-name">${item.label}</span>
          <span class="fb-sub-score">${got}<span class="fb-sub-max">/${item.max}</span></span>
          <span class="fb-sub-tag ${tagCls}">${label}</span>
        </div>
        ${tip ? `<div class="fb-tip ${iMid ? 'tip-mid' : 'tip-low'}"><span class="fb-tip-arrow">↳</span>${tip}</div>` : ''}
      </div>`;
    }).join('');

    return `
    <div class="fb-group">
      <div class="fb-group-hd grade-bg-${grade}">
        <div class="fb-gh-left">
          <span class="fb-gh-icon">${cat.icon}</span>
          <span class="fb-gh-name">${cat.label}</span>
        </div>
        <div class="fb-gh-right">
          <div class="fb-gh-bar-wrap">
            <div class="fb-gh-bar" style="width:${pct}%;background:${cat.color}"></div>
          </div>
          <span class="fb-gh-score">${cr.score}<span class="fb-gh-max">/${cat.max}</span></span>
          <span class="fb-gh-badge badge-${grade}">${gradeLabel}</span>
        </div>
      </div>
      <div class="fb-group-body">${subRows}</div>
    </div>`;
  }).join('');

  $('feedback-cards').innerHTML = overviewHTML + groupsHTML;
}

function renderTranscriptCompare(transcript, lang) {
  const preview = lang.text.split('\n').slice(0,3).join(' ') + (lang.text.split('\n').length > 3 ? '…' : '');
  $('transcript-compare').innerHTML = `
    <div class="tc-row"><div class="tc-label">방송 원문</div><div class="tc-text">${preview}</div></div>
    <div class="tc-row"><div class="tc-label">인식 결과</div><div class="tc-text recognized">${transcript || '(인식 없음 — Chrome + 마이크 허용 필요)'}</div></div>`;
}

// ===== TEXT HELPERS =====
function normalize(text) { return text.replace(/[.,!?。、·]/g,'').toLowerCase().trim(); }
function similarity(a, b) {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b, shorter = a.length > b.length ? b : a;
  if (!longer.length) return 1;
  return (longer.length - levenshtein(longer, shorter)) / longer.length;
}
function levenshtein(s, t) {
  const m = s.length, n = t.length;
  const dp = Array.from({length: m+1}, (_,i) => Array.from({length: n+1}, (_,j) => i===0 ? j : j===0 ? i : 0));
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
    dp[i][j] = s[i-1]===t[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}

// ===== SCRIPT MODAL (추가 & 편집 공용) =====
function _resetModal() {
  document.getElementById('custom-title').value = '';
  document.getElementById('custom-icon').value = '📋';
  document.getElementById('custom-difficulty').value = '기본';
  ['ko','en','ja','zh'].forEach(l => {
    const ta = document.getElementById(`custom-text-${l}`);
    if (ta) ta.value = '';
  });
  document.getElementById('custom-checkpoints-ko').value = '';
  document.querySelectorAll('.modal-lang-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.modal-lang-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('.modal-lang-tab[data-lang="ko"]').classList.add('active');
  document.getElementById('modal-lang-ko').classList.add('active');
  // table builder
  $('table-builder').classList.add('hidden');
  $('btn-table-toggle').classList.remove('active');
  // model voice
  $('mv-current').classList.add('hidden');
  $('mv-name').textContent = '';
  document.getElementById('mv-file-input').value = '';
}

function openAddModal() {
  _modalState.mode = 'add'; _modalState.editId = null; _modalState.editSource = null;
  _resetModal();
  $('modal-title-text').textContent = '✏️ 나만의 방송문 추가';
  $('modal-save').textContent = '저장하기';
  $('modal-restore').classList.add('hidden');
  $('custom-modal').classList.remove('hidden');
}
// 하위 호환성 alias
const openCustomModal = openAddModal;

function openEditModal(id, source) {
  _modalState.mode = 'edit'; _modalState.editId = id; _modalState.editSource = source;
  _resetModal();

  let script;
  if (source === 'builtin') {
    script = getEffectiveScript(id);
    $('modal-title-text').textContent = '✏️ 기본 방송문 편집';
    // 원본과 다를 경우 복원 버튼 표시
    const isModified = !!loadOverrides()[id];
    $('modal-restore').classList.toggle('hidden', !isModified);
  } else {
    script = loadCustomScripts().find(s => s.id === id);
    $('modal-title-text').textContent = '✏️ 내 방송문 편집';
    $('modal-restore').classList.add('hidden');
  }
  if (!script) return;

  document.getElementById('custom-title').value = script.title;
  document.getElementById('custom-icon').value = script.icon || '📋';
  document.getElementById('custom-difficulty').value = script.difficulty || '기본';

  ['ko','en','ja','zh'].forEach(l => {
    const ta = document.getElementById(`custom-text-${l}`);
    if (ta && script.langs[l]) ta.value = script.langs[l].text || '';
  });
  const koLang = script.langs.ko;
  if (koLang?.checkpoints) {
    document.getElementById('custom-checkpoints-ko').value = koLang.checkpoints.join(', ');
  }
  // model voice
  const voiceStored = loadModelVoice(id);
  if (voiceStored) {
    $('mv-current').classList.remove('hidden');
    $('mv-name').textContent = localStorage.getItem(`cabinvoice_voice_${id}_name`) || '모델 음성 등록됨';
  }
  $('modal-save').textContent = '수정 저장';
  $('custom-modal').classList.remove('hidden');
}

function closeCustomModal() { $('custom-modal').classList.add('hidden'); }

function saveScriptFromModal() {
  const title = document.getElementById('custom-title').value.trim();
  if (!title) { alert('방송 제목을 입력해 주세요.'); document.getElementById('custom-title').focus(); return; }
  const koText = document.getElementById('custom-text-ko').value.trim();
  if (!koText) { alert('한국어 방송 원문은 필수 입력입니다.'); document.getElementById('custom-text-ko').focus(); return; }

  const icon = document.getElementById('custom-icon').value.trim() || '📋';
  const difficulty = document.getElementById('custom-difficulty').value;
  const difficultyClass = { '기본':'', '중급':'medium', '고급':'hard' }[difficulty] || '';
  const cpStr = document.getElementById('custom-checkpoints-ko').value;

  if (_modalState.mode === 'edit' && _modalState.editSource === 'builtin') {
    // 기본 방송문 편집 → override에 저장
    const base = SCRIPTS.find(s => s.id === _modalState.editId);
    const overrides = loadOverrides();
    const newLangs = {};
    ['ko','en','ja','zh'].forEach(l => {
      const ta = document.getElementById(`custom-text-${l}`);
      const text = ta?.value.trim();
      if (text) {
        const existing = base?.langs[l] || {};
        newLangs[l] = {
          ...existing,
          text,
          checkpoints: (l === 'ko' && cpStr) ? cpStr.split(',').map(s=>s.trim()).filter(Boolean) : (existing.checkpoints || []),
          keyPhrases: extractKeyPhrases(text, l)
        };
      }
    });
    overrides[_modalState.editId] = { title, icon, difficulty, difficultyClass, langs: newLangs };
    saveOverrides(overrides);

  } else if (_modalState.mode === 'edit' && _modalState.editSource === 'custom') {
    // 커스텀 방송문 편집 → 배열 내 수정
    const arr = loadCustomScripts();
    const idx = arr.findIndex(s => s.id === _modalState.editId);
    if (idx === -1) { closeCustomModal(); return; }
    const langs = {};
    langs.ko = buildCustomLang(koText, cpStr, 'ko');
    ['en','ja','zh'].forEach(l => {
      const text = document.getElementById(`custom-text-${l}`)?.value.trim();
      if (text) langs[l] = buildCustomLang(text, '', l);
    });
    arr[idx] = { ...arr[idx], title, icon, difficulty, difficultyClass, langs };
    saveCustomScripts(arr);

  } else {
    // 새 방송문 추가
    const langs = {};
    langs.ko = buildCustomLang(koText, cpStr, 'ko');
    ['en','ja','zh'].forEach(l => {
      const text = document.getElementById(`custom-text-${l}`)?.value.trim();
      if (text) langs[l] = buildCustomLang(text, '', l);
    });
    const id = 'custom_' + Date.now();
    // pending 모델 음성 → 실제 id로 이동
    const pendingVoice = localStorage.getItem('cabinvoice_voice__pending');
    const pendingName  = localStorage.getItem('cabinvoice_voice__pending_name');
    if (pendingVoice) {
      localStorage.setItem(`cabinvoice_voice_${id}`, pendingVoice);
      localStorage.setItem(`cabinvoice_voice_${id}_name`, pendingName || '모델 음성');
      localStorage.removeItem('cabinvoice_voice__pending');
      localStorage.removeItem('cabinvoice_voice__pending_name');
    }
    const arr = loadCustomScripts();
    arr.unshift({ id, icon, colorClass:'c-blue', difficulty, difficultyClass, title, langs, _custom: true });
    saveCustomScripts(arr);
  }

  closeCustomModal();
  renderHome();
}

// PDF 파싱 결과 임시 저장 (import 시 활용)
let _pdfParsedScripts = [];

// ===== PDF IMPORT =====
function openPdfModal() {
  _showPdfStep('upload');
  $('pdf-import-btn').classList.add('hidden');
  $('pdf-modal').classList.remove('hidden');
}
function closePdfModal() { $('pdf-modal').classList.add('hidden'); }

function _showPdfStep(step) {
  ['upload','parsing','preview','error'].forEach(s => {
    $(`pdf-step-${s}`).classList.toggle('hidden', s !== step);
  });
}

async function handlePdfFile(file) {
  if (!file || file.type !== 'application/pdf') {
    _showPdfError('PDF 파일만 지원합니다. (.pdf 확장자 파일을 선택해 주세요)');
    return;
  }
  _showPdfStep('parsing');
  $('pdf-parsing-msg').textContent = 'PDF 텍스트 추출 중...';
  $('pdf-parsing-sub').textContent = file.name;

  try {
    if (!window.pdfjsLib) throw new Error('PDF.js 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    $('pdf-parsing-msg').textContent = `총 ${pdf.numPages}페이지 처리 중...`;

    let fullText = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      $('pdf-parsing-sub').textContent = `${p} / ${pdf.numPages} 페이지`;
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      // y좌표 기준으로 줄 묶기
      const lineMap = new Map();
      for (const item of content.items) {
        if (!item.str.trim()) continue;
        const y = Math.round(item.transform[5]);
        if (!lineMap.has(y)) lineMap.set(y, []);
        lineMap.get(y).push({ x: item.transform[4], str: item.str });
      }
      const sortedYs = [...lineMap.keys()].sort((a,b) => b - a); // PDF y는 아래서 위로
      for (const y of sortedYs) {
        const items = lineMap.get(y).sort((a,b) => a.x - b.x);
        fullText += items.map(i => i.str).join(' ').trim() + '\n';
      }
      fullText += '\n';
    }

    const scripts = parsePdfScripts(fullText);
    if (!scripts.length) {
      _showPdfError('방송문안을 인식하지 못했습니다.\n\n번호로 구분된 목차 구조가 없거나, 스캔 이미지 PDF일 수 있습니다.\n직접 입력 기능을 이용해 주세요.');
      return;
    }
    renderPdfPreview(scripts);
  } catch (e) {
    _showPdfError(`오류가 발생했습니다:\n${e.message}`);
  }
}

// 변형(variant) 분리: "표 제시하여 선택" 구조 처리
// [{ label, text }] 반환 — 변형 없으면 [{ label:null, text }]
function splitVariants(rawText) {
  const MARKERS = ['표 제시하여 선택', '표제시하여선택', '상황에 따라 선택', '선택 사항', '선택사항', '해당 문안 선택'];
  // "General: 텍스트..." 또는 "수하물 과다 반입: 텍스트..."
  const LABEL_COLON = /^([가-힣A-Za-z][가-힣A-Za-z0-9 \-\/]{0,28}?)\s*[：:]\s+([\s\S]+)/;
  // 콜론 없이 레이블 뒤 긴 공백 + 텍스트 (표에서 추출된 경우)
  const LABEL_SPACE = /^([가-힣A-Za-z][가-힣A-Za-z ]{2,20})\s{3,}([\s\S]{8,})/;

  const lines = rawText.split('\n').map(l => l.trim());
  let headerLines = [], variants = [], cur = null, inBlock = false;

  for (const line of lines) {
    if (!line) { if (cur) cur.text += '\n'; continue; }
    if (!inBlock && MARKERS.some(m => line.includes(m))) { inBlock = true; continue; }

    if (inBlock) {
      const m = line.match(LABEL_COLON) || line.match(LABEL_SPACE);
      if (m && m[1].trim().length <= 25) {
        if (cur) variants.push(cur);
        cur = { label: m[1].trim(), text: m[2].trim() };
      } else if (cur) {
        cur.text += '\n' + line;
      } else {
        headerLines.push(line);
      }
    } else {
      headerLines.push(line);
    }
  }
  if (cur) variants.push(cur);

  const header = headerLines.join('\n').trim();
  if (variants.length >= 2) {
    return variants.map(v => ({
      label: v.label,
      text: header ? `${header}\n${v.text.trim()}` : v.text.trim()
    }));
  }
  return [{ label: null, text: rawText.trim() }];
}

function parsePdfScripts(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const results = [];
  let chapter = '', section = '', cur = null;

  function isChapter(line) {
    return /^\d+\s*장\s*[_\s]/.test(line) || /^제\s*\d+\s*장/.test(line);
  }
  function matchDecimal(line) {
    const m = line.match(/^(\d+(?:\.\d+)+)\s*(.*)/);
    return m ? { num: m[1], rest: m[2].trim(), level: m[1].split('.').length } : null;
  }
  function iconForChapter(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('irre'))                               return '⚠️';
    if (n.includes('after landing'))                      return '🛬';
    if (n.includes('en-route') || n.includes('enroute'))  return '☁️';
    return '✈️';
  }

  // cur 항목을 변형 분리 후 results에 추가
  function flushCur() {
    if (!cur || !cur.rawText.trim()) return;
    const variants = splitVariants(cur.rawText);
    if (variants.length === 1 && !variants[0].label) {
      results.push({ num: cur.num, title: cur.title, chapter: cur.chapter,
                     section: cur.section, icon: cur.icon, text: variants[0].text });
    } else {
      variants.forEach(v => {
        results.push({ num: cur.num, title: `${cur.title} (${v.label})`,
                       chapter: cur.chapter, section: cur.section,
                       icon: cur.icon, text: v.text });
      });
    }
    cur = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isChapter(line)) {
      flushCur();
      chapter = line.replace(/^\d+\s*장\s*[_\s]+/, '')
                    .replace(/^제\s*\d+\s*장\s*/, '').trim() || line;
      section = '';
      continue;
    }

    const dec = matchDecimal(line);
    if (dec) {
      if (dec.level === 2) {
        flushCur();
        section = `${dec.num} ${dec.rest}`;
      } else if (dec.level >= 3) {
        flushCur();
        let title = dec.rest;
        if (!title && i + 1 < lines.length
            && !matchDecimal(lines[i + 1]) && !isChapter(lines[i + 1])) {
          title = lines[++i];
        }
        cur = { num: dec.num, title: title || dec.num,
                chapter, section, icon: iconForChapter(chapter), rawText: '' };
      } else {
        if (cur) cur.rawText += '\n' + line;
      }
    } else if (cur) {
      cur.rawText += (cur.rawText ? '\n' : '') + line;
    }
  }
  flushCur();
  return results;
}

function renderPdfPreview(scripts) {
  _pdfParsedScripts = scripts;           // import 시 icon 등 메타 재활용
  _showPdfStep('preview');
  $('pdf-preview-info').textContent =
    `${scripts.length}개 방송문안 인식됨 — 가져올 항목을 선택·편집하세요`;
  $('pdf-import-btn').classList.remove('hidden');

  let lastChapter = null, lastSection = null;
  const rows = scripts.map((s, i) => {
    let header = '';
    if (s.chapter !== lastChapter) {
      header += `<div class="pdf-chapter-header">${s.icon} ${s.chapter}</div>`;
      lastChapter = s.chapter; lastSection = null;
    }
    if (s.section && s.section !== lastSection) {
      header += `<div class="pdf-section-header">${s.section}</div>`;
      lastSection = s.section;
    }
    return `${header}
    <div class="pdf-script-item selected" data-idx="${i}">
      <input type="checkbox" class="pdf-script-check" checked>
      <div class="pdf-script-fields">
        <div class="pdf-script-num-title">
          <span class="pdf-script-num">${s.num}</span>
          <input class="pdf-field-input" placeholder="방송 제목"
            value="${s.title.replace(/"/g,'&quot;')}" data-field="title">
        </div>
        <textarea class="pdf-field-textarea" rows="4" data-field="text">${s.text}</textarea>
      </div>
    </div>`;
  }).join('');

  $('pdf-script-list').innerHTML = rows;
  $('pdf-script-list').querySelectorAll('.pdf-script-check').forEach(cb => {
    cb.addEventListener('change', () =>
      cb.closest('.pdf-script-item').classList.toggle('selected', cb.checked));
  });
}

function _showPdfError(msg) {
  _showPdfStep('error');
  $('pdf-error-msg').textContent = msg;
  $('pdf-import-btn').classList.add('hidden');
}

function importSelectedPdfScripts() {
  const items = $('pdf-script-list').querySelectorAll('.pdf-script-item');
  const toAdd = [];
  items.forEach(item => {
    const cb = item.querySelector('.pdf-script-check');
    if (!cb.checked) return;
    const idx   = parseInt(item.dataset.idx);
    const meta  = _pdfParsedScripts[idx] || {};
    const title = item.querySelector('[data-field="title"]').value.trim() || '방송문';
    const text  = item.querySelector('[data-field="text"]').value.trim();
    if (!text) return;
    const id = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    toAdd.push({
      id,
      icon: meta.icon || '📋',
      colorClass: 'c-blue',
      difficulty: '기본', difficultyClass: '',
      title: `${meta.num ? meta.num + ' ' : ''}${title}`,
      langs: { ko: buildCustomLang(text, '', 'ko') },
      _custom: true
    });
  });
  if (!toAdd.length) { alert('선택된 방송문이 없습니다.'); return; }
  const arr = loadCustomScripts();
  arr.unshift(...[...toAdd].reverse()); // 원래 문서 순서 유지
  saveCustomScripts(arr);
  closePdfModal();
  renderHome();
  alert(`${toAdd.length}개 방송문안을 가져왔습니다.`);
}

// ===== EVENTS =====
document.addEventListener('DOMContentLoaded', () => {
  renderHome();
  showScreen('screen-home');

  // 언어 탭
  $('lang-tabs').querySelectorAll('.lang-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $('lang-tabs').querySelectorAll('.lang-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.selectedLang = tab.dataset.lang;
      if (state.currentScript) updatePrepContent();
    });
  });

  $('btn-back-prep').addEventListener('click', () => { clearInterval(state.prepTimerInterval); showScreen('screen-home'); });
  $('btn-start-record').addEventListener('click', startRecording);
  $('btn-peek').addEventListener('click', () => $('script-peek-text').classList.toggle('hidden'));
  $('btn-stop-record').addEventListener('click', stopRecording);
  $('btn-home').addEventListener('click', () => showScreen('screen-home'));
  $('btn-retry').addEventListener('click', () => { if (state.currentScript) startPrep(state.currentScript); });

  // 스크립트 편집/추가 모달 이벤트
  $('modal-close').addEventListener('click', closeCustomModal);
  $('modal-cancel').addEventListener('click', closeCustomModal);
  $('modal-save').addEventListener('click', saveScriptFromModal);
  $('modal-restore').addEventListener('click', () => {
    if (confirm('원본 방송문으로 복원하시겠습니까? 수정 내용이 삭제됩니다.')) {
      restoreBuiltIn(_modalState.editId);
      closeCustomModal();
    }
  });
  $('custom-modal').addEventListener('click', e => { if (e.target === $('custom-modal')) closeCustomModal(); });

  // 스크립트 모달 언어 탭
  document.querySelectorAll('.modal-lang-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.modal-lang-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.modal-lang-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`modal-lang-${tab.dataset.lang}`).classList.add('active');
    });
  });

  // PDF 모달 이벤트
  $('pdf-modal-close').addEventListener('click', closePdfModal);
  $('pdf-modal-cancel').addEventListener('click', closePdfModal);
  $('pdf-modal').addEventListener('click', e => { if (e.target === $('pdf-modal')) closePdfModal(); });
  $('pdf-import-btn').addEventListener('click', importSelectedPdfScripts);
  $('pdf-retry-btn').addEventListener('click', () => _showPdfStep('upload'));

  // PDF 전체 선택/해제
  $('pdf-select-all').addEventListener('click', () => {
    $('pdf-script-list').querySelectorAll('.pdf-script-check').forEach(cb => {
      cb.checked = true; cb.closest('.pdf-script-item').classList.add('selected');
    });
  });
  $('pdf-deselect-all').addEventListener('click', () => {
    $('pdf-script-list').querySelectorAll('.pdf-script-check').forEach(cb => {
      cb.checked = false; cb.closest('.pdf-script-item').classList.remove('selected');
    });
  });

  // PDF 파일 선택
  $('pdf-file-input').addEventListener('change', e => {
    if (e.target.files[0]) handlePdfFile(e.target.files[0]);
  });

  // PDF 드래그 앤 드롭
  const dropZone = $('pdf-drop-zone');
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handlePdfFile(file);
  });

  // ===== AUTH MODAL 이벤트 =====
  $('auth-confirm').addEventListener('click', _confirmAuth);
  $('auth-cancel').addEventListener('click', () => {
    $('auth-modal').classList.add('hidden');
    _authCallback = null;
  });
  $('auth-pw-input').addEventListener('keydown', e => { if (e.key === 'Enter') _confirmAuth(); });
  $('auth-modal').addEventListener('click', e => {
    if (e.target === $('auth-modal')) { $('auth-modal').classList.add('hidden'); _authCallback = null; }
  });

  // ===== TABLE INSERT 이벤트 =====
  $('btn-table-toggle').addEventListener('click', () => {
    const builder = $('table-builder');
    const isOpen = !builder.classList.contains('hidden');
    builder.classList.toggle('hidden', isOpen);
    $('btn-table-toggle').classList.toggle('active', !isOpen);
  });
  $('tb-insert-btn').addEventListener('click', () => {
    const cols = parseInt($('tb-cols').value, 10);
    const rows = parseInt($('tb-rows').value, 10);
    const ta = document.getElementById('custom-text-ko');
    const header = '|' + Array.from({length:cols}, (_,i)=>`열${i+1}`).join('|') + '|';
    const sep    = '|' + Array(cols).fill('---').join('|') + '|';
    const dataRow= '|' + Array(cols).fill('내용').join('|') + '|';
    const tableStr = [header, sep, ...Array(rows).fill(dataRow)].join('\n');
    const pos = ta.selectionStart;
    const before = ta.value.substring(0, pos);
    const after  = ta.value.substring(pos);
    ta.value = before + (before && !before.endsWith('\n') ? '\n' : '') + tableStr + '\n' + after;
    $('table-builder').classList.add('hidden');
    $('btn-table-toggle').classList.remove('active');
    ta.focus();
  });

  // ===== MODEL VOICE 이벤트 =====
  document.getElementById('mv-file-input').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기가 너무 큽니다. 10MB 이하의 파일을 선택해 주세요.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target.result;
      const key = getModelVoiceKey();
      localStorage.setItem(key, base64);
      localStorage.setItem(key + '_name', file.name);
      $('mv-current').classList.remove('hidden');
      $('mv-name').textContent = file.name;
    };
    reader.readAsDataURL(file);
  });
  $('mv-play').addEventListener('click', () => {
    const key = getModelVoiceKey();
    const base64 = localStorage.getItem(key);
    if (!base64) return;
    if (_mvAudioUrl) URL.revokeObjectURL(_mvAudioUrl);
    const audio = new Audio(base64);
    audio.play();
  });
  $('mv-del').addEventListener('click', () => {
    const key = getModelVoiceKey();
    localStorage.removeItem(key);
    localStorage.removeItem(key + '_name');
    $('mv-current').classList.add('hidden');
    $('mv-name').textContent = '';
    document.getElementById('mv-file-input').value = '';
  });

  // ===== 모델 음성 듣기 버튼 (prep screen) =====
  $('btn-model-voice').addEventListener('click', () => {
    const s = state.currentScript;
    if (!s) return;
    const base64 = loadModelVoice(s.id);
    if (!base64) return;
    const audio = new Audio(base64);
    audio.play();
    $('btn-model-voice').textContent = '🔊 재생 중...';
    audio.onended = () => { $('btn-model-voice').textContent = '🎙 모델 음성 듣기'; };
    audio.onerror = () => { $('btn-model-voice').textContent = '🎙 모델 음성 듣기'; alert('음성 파일을 재생할 수 없습니다.'); };
  });
});
