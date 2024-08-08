//変数定義
let envName;
let pathName;
let data;
let facebookFlag = false;
let affiliateToken;
let rd_code = '';

//ページ読み込み時処理
window.addEventListener('DOMContentLoaded', async function () {

  envName = location.hostname;
  pathName = location.pathname.replace('/', '').replace('/', '');

  try {
    const query = new URLSearchParams({
      id: pathName,
      env: envName == "assign-inc.com" ? "prod" : "develop",
    });

    const test_requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    const result = await fetch("https://3gemo9lnbb.execute-api.ap-northeast-1.amazonaws.com/dev/graphql?" + query, test_requestOptions)
      .then(success => {
        return success.json()
      })
      .catch(err => {
        return err
      });

    data = result.data.getItems;
    if (!Boolean(data)) {
      window.location.href = '/' + pathName + '/pages/error.html';
    };
  } catch (err) {
    if (err != 'TypeError: Load failed' || err != 'TypeError: Failed to fetch') {
      await sendError('【ページ読み込み時エラー】' + String(err), true);
    };
  }

  const ref = document.referrer;
  const params = ref.searchParams;

  try { rd_code = params.get('rd_code') } catch { };


  //facebookから遷移してきた際にはフラグを立てる
  if (ref.indexOf('facebook.com') !== -1) {
    facebookFlag = true;
  };

  // tabでの移動を制限するため、tabindex属性を各入力項目に付与する
  for (let i = 1; i < 9; i++) {
    const elementId = `q0${i}_01`;
    const inputElement = document.getElementById(elementId);
    inputElement.setAttribute('tabindex', '-1');
  }
  // 名前入力欄の対応
  const elementId0602 = `q06_02`;
  const inputElement0602 = document.getElementById(elementId0602);
  inputElement0602.setAttribute('tabindex', '-1');
  // リンクの対応
  const aTags = document.getElementsByTagName('a');
  for (let i = 0; i < aTags.length; i++) {
    aTags[i].setAttribute('tabindex', '-1');
  }
  const submitElement = document.getElementById('form_submit');
  submitElement.setAttribute('tabindex', '-1');
});

//「送信」ボタンを押した際の処理
document.getElementById('form_submit').onclick = async function entrySubmit() {

  // 電話番号が入力されていない場合はアラートを表示して処理を中断する
  const q8InputValue = document.getElementById('q08_01').value;
  const q8Caution = document.getElementById('caution08');
  const regexp_phone = /^((050|070|080|090)|(０５０|０７０|０８０|０９０))((\d|[０-９]){4})((\d|[０-９]){4})$/;
  if (q8InputValue && regexp_phone.test(q8InputValue.replace(/-|\s|ー|－/g, ""))) {
    q8Caution.style.display = "none";
  } else {
    q8Caution.style.display = "inline";
    return;
  }

  //ローディング表示
  loading("on");

  //入力情報バリデーション
  const graduationYear = document.querySelector('input[name="graduationYear"]:checked').value ?? '';
  const jobExperienceCount = document.querySelector('input[name="jobChangeCount"]:checked').value ?? '';
  const jobChangeCount = jobExperienceCount === '5' ? '5社以上' : jobExperienceCount + '社';
  const comment = '経験社数:' + jobChangeCount + '\n' + (graduationYear === '2007' ? '2007年卒以前のため、年齢は登録データよりも高い可能性あり' : graduationYear);
  const job = document.querySelector('input[name="job"]:checked').value;
  const school = document.getElementById('q04_01').value ?? '';
  const schoolLevel = await getSchoolCategory(school);
  const company = document.getElementById('q05_01').value ?? '';
  const lastName = document.getElementById('q06_01').value ?? '';
  const firstName = document.getElementById('q06_02').value ?? '';
  const customerEmail = document.getElementById('q07_01').value ?? '';
  const phone = document.getElementById('q08_01').value ?? '';

  //卒業年月日から年齢計算
  const age = String((new Date().getFullYear()) - Number(graduationYear) + 22);

  //エントリー日取得
  let dd = new Date();
  let YYYY = dd.getFullYear();
  let MM = dd.getMonth() + 1;
  let DD = dd.getDate();

  //IPアドレス取得
  let ipAddress;
  await fetch('https://ipinfo.io?callback')
    .then(res => res.json())
    .then(json => ipAddress = json.ip)

  if (!ipAddress) {
    ipAddress = "109.236.0.18"
  };

  //ASNカレンダー用のjson
  let raw = JSON.stringify({
    "channel_id": data["basic_data"]["channel_id"],
    "channel": data["basic_data"]["channel_name"],
    "last_name": lastName,
    "first_name": firstName,
    "email": customerEmail,
    "phone": phone,
    "age": age + '歳',
    "address": '',
    "gender_id": '',
    "detail": '',
    "job": job,
    "company": company,
    "school": school,
    "comment": comment,
    "entry_date": YYYY + "-" + MM + "-" + DD,
  });

  //ASNカレンダーにデータ引継ぎ
  sessionStorage.setItem('formData', raw);

  //リダイレクトのための下準備
  let url = null;
  let rawConditions = data["developtool"]["redirect"].replace(/\n/g, '').replace(/  /g, '');
  rawConditions = rawConditions.split('},').slice(0, -1);
  let conditions = []
  for (let i = 0; i < rawConditions.length; i++) {
    conditions.push(JSON.parse(rawConditions[i] + '}'))
  };

  //conditions内で合致する条件を検索
  for (let i = 0; i < conditions.length; i++) {
    let condition = conditions[i];
    let logic = condition.logic;
    let isValid = true;

    // eval()を使って条件を評価する
    try {
      isValid = eval(logic);
    } catch (e) {
      await sendError('【エントリー完了後のリダイレクト時エラー】' + String(e), false);
      continue;
    };

    if (isValid) {
      url = condition.url;
      break;
    };
  };

  //Lambda用のリクエスト作成
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: encodeURIComponent(JSON.stringify({
      "gender": '',
      "age": age,
      "job": job,
      "jobchange": jobExperienceCount,
      "address": '',
      "name": (lastName.replace(/\s/g, '') + ' ' + firstName.replace(/\s/g, '')),
      "school": school,
      "company": company,
      "comment": comment,
      "customerEmail": customerEmail,
      "phone": phone,
      "ipAddress": ipAddress,
      "userAgent": navigator.userAgent,
      "agentEmailCC": data["entry_mail"]["cc"],
      "agentEmailSubject": data["entry_mail"]["subject"],
      "agentEmailBody": data["entry_mail"]["body"],
      "customerEmailSentBy": data["customer_mail"]["mail"],
      "customerEmailName": data["customer_mail"]["name"],
      "customerEmailSubject": url ? data["customer_mail"]["subject"] : "",
      "customerEmailBody": url ? data["customer_mail"]["body"].replace(/{{CALENDAR_URL}}/g, url) : "",
      "channel": data["basic_data"]["channel_name"],
      "channel_id": data["basic_data"]["channel_id"],
      "spreadsheet": String(data["affiliate"]["spreadsheet"]),
      "isValid": !!url
    }))
  };

  //Lambdaにリクエストを送信
  await fetch("https://2acbb5gq6k.execute-api.ap-northeast-1.amazonaws.com/queue/prod", requestOptions)

  //facebook広告から遷移してきた場合の処理
  if (facebookFlag == true) {
    let fbc;
    let fbp;

    try {
      //fbc取得
      fbc = document.cookie
        .split('; ')
        .find(row => row.startsWith('_fbc'))
        .split('=')[1];

      //fbp取得
      fbp = document.cookie
        .split('; ')
        .find(row => row.startsWith('_fbp'))
        .split('=')[1];
    } catch {
      sendError('【fbpc・fbp取得時エラー】' + String(e), false);
    }

    //パラメーターで指定されたidについて、DBから情報を取得
    const facebpookRaw = JSON.stringify({
      "email": email,
      "phone": phone,
      "ipAddress": String(ipAddress),
      "clientUserAgent": String(navigator.userAgent),
      "fbc": String(fbc),
      "fbp": String(fbp)
    });

    const facebookRequestOptions = {
      method: 'POST',
      contentType: 'application/json',
      body: facebpookRaw,
      redirect: 'follow'
    };

    const facebookPromise = await fetch("https://x6dpa4gbp3.execute-api.ap-northeast-1.amazonaws.com/dev/", facebookRequestOptions)
    const facebookData = await facebookPromise.json();

    if (facebookData["statusCode"] != 200) {
      sendError('【facebookコンバージョン時エラー】' + String(e), false);
    };
  };

  //moshimoからのCV計測
  if (rd_code != '') {
    const script = document.createElement('script');
    script.src = `https://r.moshimo.com/af/r/result.js?p_id=【プロモーションID】&pc_id=【成果地点ID】&m_v=【申込ID等】&rd_code=${rd_code}`;
    script.id = "msmaf";
    script.async = true;
    document.body.appendChild(script);
  };

  //条件に沿ったページに遷移
  window.location.href = url ?? ('/' + pathName + "/pages/finish.html");

  //ローディング非表示
  loading("off");
};

//送信ボタンのローディング処理
function loading(turn) {
  if (turn == "on") {
    //送信ボタンをローディング表示に
    document.getElementById('form_submit_loading').style.display = 'block';
    document.getElementById('form_submit').style.display = 'none';
  } else if (turn == "off") {
    //ローディング表示解除
    document.getElementById('form_submit_loading').style.display = 'none';
    document.getElementById('form_submit').style.display = 'block';
  };
};

//エラーを送信する際の処理
async function sendError(errorContent, redirect) {
  const dd = new Date();
  let errorTime = dd.getFullYear() + '/' + String(dd.getMonth() + 1) + '/' + dd.getDate() + ' ' + dd.getHours() + ':' + dd.getMinutes() + ':' + dd.getSeconds();
  let errorPage = pathName;
  let errorType = 'index.js';

  //GASにリクエストを送る
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `time=${errorTime}&page=${errorPage}&type=${errorType}&content=${errorContent}`,
  };

  await fetch("https://script.google.com/macros/s/AKfycbwz9EPd6kPysRy5OazRMrM9bzhzo61ckOkOQ2yV4uL5mvE33eOVBUYyZFt20IWkX8EDvQ/exec", requestOptions)

  if (redirect == true) {
    window.location.href = '/' + pathName + '/pages/error.html';
  };
};

async function getSchoolCategory(
  school
) {
  const text = await fetch('data.txt').then(res => res.text());
  const data = JSON.parse(decodeURIComponent(text));
  const res = data[school];
  if (res) return res;
  if (
    school.includes("専門") ||
    school.includes("短期大学") ||
    school.includes("短大")
  ) {
    return "専門/短大";
  }
};

//ボタンの定義
const clickNext = document.getElementsByClassName('scroll_next');
const clickPrev = document.getElementsByClassName('scroll_prev');
const targetArea = document.getElementById('form_scroll_area');

//フォームでの次の設問への遷移処理(学校名・会社名・氏名・メールアドレス以外)
for (let i = 0; i < clickNext.length; i++) {
  clickNext[i].addEventListener('click', () => {
    const x = targetArea.scrollLeft;
    var moveRange = window.innerWidth;
    if (moveRange > 980) {
      moveRange = 980;
    }
    targetArea.scrollTo({
      left: x + moveRange,
      behavior: 'smooth'
    })
  });
}

//フォームでの前の設問への遷移処理(氏名・メールアドレス以外)
for (let i = 0; i < clickPrev.length; i++) {
  clickPrev[i].addEventListener('click', () => {
    const x = targetArea.scrollLeft;
    var moveRange = window.innerWidth;
    if (moveRange > 980) {
      moveRange = 980;
    }
    targetArea.scrollTo({
      left: x - moveRange,
      behavior: 'smooth'
    })
  });
}

//フォームでの次の設問への遷移処理(学校)
const q4Button = document.getElementById('scroll_next_04');
q4Button.addEventListener('click', () => {
  const x = targetArea.scrollLeft;
  const q4InputValue = document.getElementById('q04_01').value;
  const q4Caution = document.getElementById('caution04');
  var moveRange = window.innerWidth;
  if (moveRange > 980) {
    moveRange = 980;
  }
  if (q4InputValue) {
    targetArea.scrollTo({
      left: x + moveRange,
      behavior: 'smooth'
    })
    q4Caution.style.display = "none";
  } else {
    q4Caution.style.display = "inline";
  }
});

//フォームでの次の設問への遷移処理(会社)
const q5Button = document.getElementById('scroll_next_05');
q5Button.addEventListener('click', () => {
  const x = targetArea.scrollLeft;
  const q5InputValue = document.getElementById('q05_01').value;
  const q5Caution = document.getElementById('caution05');
  var moveRange = window.innerWidth;
  if (moveRange > 980) {
    moveRange = 980;
  }
  if (q5InputValue) {
    targetArea.scrollTo({
      left: x + moveRange,
      behavior: 'smooth'
    })
    q5Caution.style.display = "none";
  } else {
    q5Caution.style.display = "inline";
  }
});

//フォームでの次の設問への遷移処理(氏名)
const q6Button = document.getElementById('scroll_next_06');
q6Button.addEventListener('click', () => {
  const x = targetArea.scrollLeft;
  const q6InputValue01 = document.getElementById('q06_01').value || "";
  const q6InputValue02 = document.getElementById('q06_02').value || "";
  const q6Caution = document.getElementById('caution06');
  var moveRange = window.innerWidth;
  if (moveRange > 980) {
    moveRange = 980;
  }
  if (getByteLength(q6InputValue01) >= 2 && getByteLength(q6InputValue02) >= 2) {
    targetArea.scrollTo({
      left: x + moveRange,
      behavior: 'smooth'
    })
    q6Caution.style.display = "none";
  } else {
    q6Caution.style.display = "inline";
  }
});

//フォームでの次の設問への遷移処理(メールアドレス)
const q7Button = document.getElementById('scroll_next_07');
q7Button.addEventListener('click', () => {
  const x = targetArea.scrollLeft;
  const q7InputValue = document.getElementById('q07_01').value;
  const q7Caution = document.getElementById('caution07');
  var moveRange = window.innerWidth;
  if (moveRange > 980) {
    moveRange = 980;
  }
  if (q7InputValue.match(/^[a-z0-9._%+-]{3,}@[a-z0-9.-]+\.[a-z]{2,3}$/) && !q7InputValue.match(/\s/)) {
    targetArea.scrollTo({
      left: x + moveRange,
      behavior: 'smooth'
    })
    q7Caution.style.display = "none";
  } else {
    q7Caution.style.display = "inline";
  }
});

// フォーム完了ボタンを押下した際にボタン化にサンクステキストを表示させる処理（不要）
// document.getElementById('submit_button').addEventListener('click', () => {
// 	const submitButton  = document.getElementById('submit_button');
// 	submitButton.style.background = "#888888";
// 	submitButton.style.boxShadow = "none";
// 	const thanksText = document.getElementById('thanks_text');
// 	thanksText.style.display = "inline";
// });

function getByteLength(str) {
  return new Blob([str]).size;
}