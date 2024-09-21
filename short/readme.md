1. 설정값 설명
{
  "access_key": "ey7jm32B1x0xw51eBxDelfNR4fRclHsA5wkfmf5t",
  "secret_key": "B1gz049ZvEoY4rCjNqxxqwlMBB6Xm22Uc16Brxmt",
  "only_buy": true, //true명 구매 false 구매 판매도 합니다.
  "test_mode": true,//true명 시뮬레이션 false면 실제 구매와 판매를 합니다.
  "invest": 10000,//한번 투자금액.1만원어치를 산다.
  "margin": 0.1, //0.1%면 판다.
  "stopLoss": -0.1, //-0.1%면 판다 손절한다.
  "isTargetInclude24Price": false, // 코인 필터링
  "isTargetInclude24Volume": false, // 코인 필터링
  "isTargetIncludeChkClosingPrice": false, // 코인 필터링
  "isTargetMarketsIsRising": true, // 코인 필터링
  "isTargetMarketsIsRisingRatio": 50, // 코인 필터링
  "isTargetBitcoinIsRising": true, // 코인 필터링
  "isLoveMyMarkets": true, //특정코인만 거래경우 true..false는 전체 코인을 대상으로 합니다.
  "myLovelyMarkets": "BTC,ETH",//BTC
  "isProfitAgoMarkets": false,
  "profitAgoMarketsLength": 10,
  "profitAgoMarketsMin": 30,
  "isTrendingUpward": true, true명 상승추세일때 사고 팝니다. false 하향추세일떄 사고 팝니다.
  "targetMarketMaxSize": 150, 150개까지만 조사를 한다...
  "candleUnit": 1, 분봉만 가능하고 1이면 1분봉 
  "useTrendingMA": true, 이동평균선 
  "maType": "SMA", //EMA -지수이평선  SMA - 기본이평선 1 10 100
  "targetShort": 30, 단기 분
  "targetMid": 100, //중기 분
  "targetLong": 300, //장기 분 
  "useMinimumIncreases": true, //최소 상승률 
  "targetShortValue": 1, 1% 이상상승했을떄
  "targetMidValue": 3, 3% 이상 상승했을때 
  "targetLongValue": 9, 9% 이상 상승했을떄 
  "useBollinger": fals,e 
  "bollingerPeriod": 20,
  "bollingerStdDev": 2,
  "usePSAR": false,
  "psarStep": 0.02,
  "psarMaxStep": 0.2,
  "sellLoopMaxCount": 1000
}