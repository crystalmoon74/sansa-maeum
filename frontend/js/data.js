// 사찰·수행 단계·법문 등 정적 데이터

export const TEMPLES = [
  {
    id: "bulguksa", name: "불국사", hanja: "佛國寺", region: "경북 경주 · 토함산",
    tagline: "부처님의 나라를 꿈꾼 신라의 돌계단",
    hall: "대웅전",
    features: ["청운교·백운교", "다보탑과 석가탑", "유네스코 세계유산"],
    desc: "서른세 계단의 청운교와 백운교를 오르면 다보탑과 석가탑이 마주 선 대웅전 앞마당이 열립니다.",
    photo: {
      src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/Bulguksageumdongbirojanabuljwasang_%28Seated_gilt-bronze_vairocana_buddha_statue_of_Bulguksa_Temple%29.jpg/960px-Bulguksageumdongbirojanabuljwasang_%28Seated_gilt-bronze_vairocana_buddha_statue_of_Bulguksa_Temple%29.jpg",
      page: "https://commons.wikimedia.org/wiki/File:Bulguksageumdongbirojanabuljwasang_(Seated_gilt-bronze_vairocana_buddha_statue_of_Bulguksa_Temple).jpg",
      caption: "불국사 비로전 금동비로자나불좌상 (국보)", credit: "mikeswe (Flickr)", license: "CC BY-SA 2.0", pos: "50% 30%", portrait: true,
    },
    sky: ["#f6e3c4", "#e9c9a0"], hill: "#7d8f74",
  },
  {
    id: "haeinsa", name: "해인사", hanja: "海印寺", region: "경남 합천 · 가야산",
    tagline: "팔만대장경을 품은 법보종찰",
    hall: "대적광전",
    features: ["장경판전", "팔만대장경", "법보사찰"],
    desc: "바람이 스스로 드나드는 장경판전에 팔만 장이 넘는 경판이 칠백 년 넘게 고요히 쉬고 있습니다.",
    photo: {
      src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/26/Haeinsa_Temple_06.jpg/960px-Haeinsa_Temple_06.jpg",
      page: "https://commons.wikimedia.org/wiki/File:Haeinsa_Temple_06.jpg",
      caption: "해인사 법당에 모신 부처님", credit: "Bernard Gagnon", license: "CC0", pos: "50% 40%",
    },
    sky: ["#e7ecdf", "#c9d4c0"], hill: "#5f7a68",
  },
  {
    id: "tongdosa", name: "통도사", hanja: "通度寺", region: "경남 양산 · 영축산",
    tagline: "불상 대신 진신사리를 모신 불보종찰",
    hall: "대웅전",
    features: ["금강계단", "진신사리", "불보사찰"],
    desc: "대웅전에는 불상이 없습니다. 창 너머 금강계단에 모신 부처님 진신사리를 향해 절을 올립니다.",
    photo: {
      src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/19/Eungjinjeon_Hall_02.jpg/960px-Eungjinjeon_Hall_02.jpg",
      page: "https://commons.wikimedia.org/wiki/File:Eungjinjeon_Hall_02.jpg",
      caption: "통도사 응진전의 부처님", credit: "Bernard Gagnon", license: "CC0", pos: "55% 40%",
    },
    sky: ["#f1e6d2", "#dfc7a6"], hill: "#6f8a6b",
  },
  {
    id: "songgwangsa", name: "송광사", hanja: "松廣寺", region: "전남 순천 · 조계산",
    tagline: "열여섯 국사를 배출한 승보종찰",
    hall: "대웅보전",
    features: ["우화각", "계곡의 홍교", "승보사찰"],
    desc: "계곡 위 무지개다리에 앉은 우화각을 건너면, 수행자의 맑은 기운이 가득한 도량에 닿습니다.",
    photo: {
      src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/%EC%86%A1%EA%B4%91%EC%82%AC_%EB%AA%A9%EC%A1%B0%EC%82%BC%EC%A1%B4%EB%B6%88%EA%B0%90.jpg/960px-%EC%86%A1%EA%B4%91%EC%82%AC_%EB%AA%A9%EC%A1%B0%EC%82%BC%EC%A1%B4%EB%B6%88%EA%B0%90.jpg",
      page: "https://commons.wikimedia.org/wiki/File:%EC%86%A1%EA%B4%91%EC%82%AC_%EB%AA%A9%EC%A1%B0%EC%82%BC%EC%A1%B4%EB%B6%88%EA%B0%90.jpg",
      caption: "송광사 목조삼존불감 (국보)", credit: "작자 미상", license: "퍼블릭 도메인", pos: "50% 45%",
    },
    sky: ["#e4ede9", "#c3d6cf"], hill: "#4f7464",
  },
  {
    id: "buseoksa", name: "부석사", hanja: "浮石寺", region: "경북 영주 · 봉황산",
    tagline: "배흘림기둥에 기대어 보는 노을",
    hall: "무량수전",
    features: ["무량수전", "배흘림기둥", "떠 있는 돌, 부석"],
    desc: "천 년 가까이 선 무량수전의 배흘림기둥에 기대면, 겹겹의 소백산 능선 위로 노을이 번집니다.",
    photo: {
      src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/Seated_clay_buddha_statue_of_Buseoksa_Temple.jpg/960px-Seated_clay_buddha_statue_of_Buseoksa_Temple.jpg",
      page: "https://commons.wikimedia.org/wiki/File:Seated_clay_buddha_statue_of_Buseoksa_Temple.jpg",
      caption: "부석사 무량수전 소조아미타여래좌상 (국보)", credit: "tristanskye (Flickr)", license: "CC BY 2.0", pos: "60% 20%", portrait: true,
    },
    sky: ["#f7d9b8", "#e7a77f"], hill: "#7c6f88",
  },
];

export const templeById = (id) => TEMPLES.find((t) => t.id === id);

export const STEPS = [
  { key: "arrival", name: "입재", sub: "산문에 들어서기", time: "오후 2시" },
  { key: "yebul", name: "예불", sub: "범종 울리기", time: "새벽 4시" },
  { key: "gongyang", name: "발우공양", sub: "감사히 먹기", time: "아침 6시" },
  { key: "ulyeok", name: "울력", sub: "청소와 설거지", time: "아침 7시" },
  { key: "meditation", name: "참선", sub: "고요히 앉기", time: "오전 9시" },
  { key: "dharma", name: "법문", sub: "부처님 말씀 듣기", time: "오전 10시" },
  { key: "hoehyang", name: "회향", sub: "마음 돌려놓기", time: "오전 11시" },
];

export const OGWANGE = [
  "이 음식이 어디서 왔는가",
  "내 덕행으로는 받기가 부끄럽네",
  "마음의 온갖 욕심을 버리고",
  "몸을 지탱하는 약으로 알아",
  "깨달음을 이루고자 이 공양을 받습니다",
];

// 법구경(Dhammapada) 구절을 쉽게 풀어 옮긴 문장
export const VERSES = [
  { src: "법구경 2", text: "모든 일은 마음이 앞서 가고, 마음이 주인이 되어 짓는다. 맑은 마음으로 말하고 행하면 즐거움이 그림자처럼 따른다." },
  { src: "법구경 5", text: "미움은 미움으로 그치지 않는다. 미움을 내려놓을 때에야 비로소 그친다. 이것은 오래된 진리이다." },
  { src: "법구경 103", text: "싸움터에서 백만 명을 이기는 것보다 자기 자신 하나를 이기는 이가 가장 훌륭한 승리자이다." },
  { src: "법구경 81", text: "단단한 바위가 바람에 흔들리지 않듯, 지혜로운 이는 칭찬과 비난에 흔들리지 않는다." },
  { src: "법구경 122", text: "물방울이 떨어져 항아리를 채우듯, 작은 선한 일이 모여 지혜로운 이를 가득 채운다." },
  { src: "법구경 204", text: "건강은 가장 큰 이익이요, 만족은 가장 큰 재산이며, 믿음은 가장 좋은 벗이다." },
  { src: "법구경 82", text: "깊은 호수가 맑고 고요하듯, 가르침을 들은 이의 마음도 맑고 고요해진다." },
  { src: "법구경 160", text: "스스로가 자신의 의지처이다. 누가 따로 의지처가 되겠는가. 자신을 잘 다스리면 얻기 어려운 의지처를 얻는다." },
];

export const MINDS = ["쉬고 싶은 마음", "비우고 싶은 마음", "감사한 마음", "불안한 마음", "새로 시작하는 마음", "누군가를 위한 마음"];

export const FOR_WHOM = { self: "나", child: "자녀", family: "가족", other: "소중한 이" };
export const FOR_WHOM_OBJ = { self: "나를", child: "자녀를", family: "가족을", other: "소중한 이를" };
export const CATEGORIES = {
  suneung: "수능 합격", exam: "시험 합격", health: "건강", peace: "마음의 평안", etc: "그 밖의 소원",
};
export const BOW_TARGETS = [3, 21, 108];
