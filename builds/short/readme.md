{
  // [업비트 API 키 설정]
  // API 키와 시크릿 키는 절대 공유하거나 공개하지 마세요.
  "access_key": "YOUR_ACCESS_KEY",       // 업비트에서 발급받은 액세스 키
  "secret_key": "YOUR_SECRET_KEY",       // 업비트에서 발급받은 시크릿 키

  // [거래 모드 설정]
  "test_mode": false,                    // false: 실제 거래 모드, true: 테스트 모드

  // [투자 금액 설정]
  "invest": 10000,                       // 개별 거래 시 투자할 금액 (KRW 기준)

  // [시장 조건 설정]
  "isTargetMarketsIsRising": true,       // 전체 시장 상승 시에만 거래
  "isTargetMarketsIsRisingRatio": 70,    // 상승 중인 시장의 최소 비율 (%)
  "isTargetBitcoinIsRising": true,       // 비트코인 상승 시에만 거래

  // [대상 마켓 설정]
  "isLoveMyMarkets": false,              // 선호하는 코인만 거래할지 여부
  "myLovelyMarkets": "BTC",              // 선호하는 코인 목록 (쉼표로 구분)
  "isProfitAgoMarkets": true,            // 과거 수익률이 높은 코인만 거래
  "profitAgoMarketsLength": 5,           // 상위 수익 코인 수
  "profitAgoMarketsMin": 60,             // 몇 분 전까지의 수익률을 고려할지 (분 단위)

  // [추세 설정]
  "isTrendingUpward": true,              // 상승 추세의 코인만 거래 (true: 상승, false: 하락)
  "candleUnit": 1,                       // 캔들 단위 (분 단위)
  "trendCheckMinutes": 60,               // 추세를 확인할 기간 (분 단위)
  "checkRecentUpwardTrend": true,        // 최근 상승 추세 여부 확인

  // [이동평균선 설정]
  "useTrendingMA": true,                 // 이동평균선을 활용한 추세 판단 사용
  "maType": "SMA",                       // 이동평균선 종류 ("SMA" 또는 "EMA")
  "targetShort": 5,                      // 단기 이동평균선 기간
  "targetMid": 10,                       // 중기 이동평균선 기간
  "targetLong": 60,                      // 장기 이동평균선 기간

  // [최소 상승률 설정]
  "useMinimumIncreases": true,           // 최소 상승률 조건 사용
  "targetShortValue": 0.1,               // 단기 최소 상승률 (%)
  "targetMidValue": 0.1,                 // 중기 최소 상승률 (%)
  "targetLongValue": 0.1,                // 장기 최소 상승률 (%)

  // [볼린저 밴드 설정]
  "useBollinger": true,                  // 볼린저 밴드 사용 여부
  "bollingerPeriod": 20,                 // 볼린저 밴드 기간
  "bollingerStdDev": 2,                  // 볼린저 밴드 표준 편차

  // [PSAR 설정]
  "usePSAR": true,                       // PSAR 지표 사용 여부
  "psarStep": 0.02,                      // PSAR 스텝 값
  "psarMaxStep": 0.2,                    // PSAR 최대 스텝 값

  // [RSI 설정]
  "useRSI": true,                        // RSI 지표 사용 여부
  "rsiPeriod": 14,                       // RSI 기간
  "rsiBuyThreshold": 30,                 // RSI 매수 임계값 (30 이하이면 매수 신호)
  "rsiSellThreshold": 70,                // RSI 매도 임계값 (70 이상이면 매도 신호)

  // [마켓 필터링 설정]
  "isTargetInclude24Price": false,       // 24시간 거래 금액 기준 필터링 여부
  "isTargetInclude24Volume": false,      // 24시간 거래량 기준 필터링 여부
  "isTargetIncludeChkClosingPrice": true,// 현재가 > 전일 종가인 마켓만 선택
  "targetMarketMaxSize": 150             // 최대 고려 마켓 수
}
