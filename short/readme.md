암호화폐 자동 거래 봇 설정 가이드
======================================

1. 업비트 API 키 설정
---------------------
access_key: "YOUR_ACCESS_KEY"
secret_key: "YOUR_SECRET_KEY"

설명: 
- access_key는 업비트에서 발급받은 API 접근 키입니다.
- secret_key는 업비트에서 발급받은 비밀 키입니다.

주의: 이 키들은 여러분의 계정에 직접 접근할 수 있는 중요한 정보입니다. 
절대로 다른 사람과 공유하거나 공개된 장소에 노출하지 마세요.

설정 방법:
1. 업비트 웹사이트에 로그인합니다.
2. '고객센터' > 'Open API 안내' 페이지로 이동합니다.
3. API 키 발급 절차를 따라 새 키를 생성합니다.
4. 발급받은 키를 이 설정 파일의 해당 필드에 복사-붙여넣기 합니다.

2. 거래 모드 설정
-----------------
test_mode: false

설명:
- true로 설정하면 실제 거래를 하지 않고 시뮬레이션만 실행합니다.
- false로 설정하면 실제 금전을 사용하여 거래합니다.

설정 방법: 
처음 사용할 때는 true로 설정하여 실제 돈을 걸지 않고 테스트해보는 것이 좋습니다. 
충분히 테스트한 후 실제 거래를 원할 때 false로 변경하세요.

3. 투자 금액 설정
-----------------
invest: 10000

설명: 
각 거래마다 투자할 금액을 원화(KRW) 단위로 설정합니다.

설정 방법: 
여러분이 각 거래에 투자하고 싶은 금액을 입력하세요. 
예를 들어, 10,000원씩 투자하고 싶다면 10000으로 설정합니다.

4. 시장 조건 설정
-----------------
isTargetMarketsIsRising: true
isTargetMarketsIsRisingRatio: 70
isTargetBitcoinIsRising: true

설명:
- isTargetMarketsIsRising: 
  true로 설정하면 전체 시장이 상승 중일 때만 거래합니다.
  false로 설정하면 시장 동향에 관계없이 거래합니다.

- isTargetMarketsIsRisingRatio: 
  전체 시장 중 상승 중인 코인의 비율이 이 값보다 높을 때만 거래합니다.
  예: 70으로 설정하면, 전체 코인의 70% 이상이 상승 중일 때만 거래합니다.

- isTargetBitcoinIsRising:
  true로 설정하면 비트코인이 상승 중일 때만 거래합니다.
  false로 설정하면 비트코인 가격과 관계없이 거래합니다.

설정 방법:
시장 상황에 따라 거래하고 싶다면 이 값들을 true로 설정하세요.
더 보수적인 전략을 원한다면 isTargetMarketsIsRisingRatio를 높게 설정하세요.

5. 대상 마켓 설정
-----------------
isLoveMyMarkets: false
myLovelyMarkets: "BTC"
isProfitAgoMarkets: true
profitAgoMarketsLength: 5
profitAgoMarketsMin: 60

설명:
- isLoveMyMarkets: 
  true로 설정하면 myLovelyMarkets에 명시된 코인들만 거래합니다.

- myLovelyMarkets: 
  선호하는 코인들의 티커를 쉼표로 구분하여 입력합니다. 
  예: "BTC,ETH,XRP"

- isProfitAgoMarkets: 
  true로 설정하면 과거 수익률이 높았던 코인들만 거래합니다.

- profitAgoMarketsLength: 
  과거 수익률 기준으로 상위 몇 개의 코인을 선택할지 설정합니다.

- profitAgoMarketsMin: 
  몇 분 전까지의 수익률을 고려할지 설정합니다.

설정 방법:
특정 코인들만 거래하고 싶다면 isLoveMyMarkets를 true로 설정하고 
myLovelyMarkets에 해당 코인들을 입력하세요.
최근 수익률이 좋은 코인들을 자동으로 선택하게 하려면 isProfitAgoMarkets를 
true로 설정하세요.

6. 추세 설정
------------
isTrendingUpward: true
candleUnit: 1
trendCheckMinutes: 60
checkRecentUpwardTrend: true

설명:
- isTrendingUpward: 
  true로 설정하면 상승 추세의 코인만 거래합니다.
  false로 설정하면 하락 추세의 코인만 거래합니다.

- candleUnit: 
  가격 데이터를 분석할 때 사용할 캔들의 시간 단위(분)입니다.

- trendCheckMinutes: 
  추세를 확인할 기간(분)입니다.

- checkRecentUpwardTrend: 
  true로 설정하면 최근의 상승 추세만 확인합니다.

설정 방법:
상승장에서 거래하고 싶다면 isTrendingUpward를 true로 설정하세요.
더 장기적인 추세를 보고 싶다면 trendCheckMinutes를 높게 설정하세요.

7. 이동평균선 설정
------------------
useTrendingMA: true
maType: "SMA"
targetShort: 5
targetMid: 10
targetLong: 15

설명:
- useTrendingMA: 
  true로 설정하면 이동평균선을 사용하여 추세를 판단합니다.

- maType: 
  사용할 이동평균선의 종류입니다. "SMA"(단순이동평균) 또는 "EMA"(지수이동평균)

- targetShort, targetMid, targetLong: 
  단기, 중기, 장기 이동평균선의 기간(캔들 수)입니다.

설정 방법:
이동평균선을 사용하여 추세를 판단하고 싶다면 useTrendingMA를 true로 설정하세요.
더 민감한 반응을 원한다면 EMA를, 더 안정적인 신호를 원한다면 SMA를 선택하세요.

8. 최소 상승률 설정
-------------------
useMinimumIncreases: true
targetShortValue: 0.1
targetMidValue: 0.1
targetLongValue: 0.1

설명:
- useMinimumIncreases: 
  true로 설정하면 최소 상승률 조건을 적용합니다.

- targetShortValue, targetMidValue, targetLongValue: 
  각각 단기, 중기, 장기의 최소 상승률(%)입니다.

설정 방법:
일정 수준 이상 상승한 코인만 거래하고 싶다면 이 값들을 설정하세요.
예를 들어, 0.1로 설정하면 0.1% 이상 상승한 코인만 거래합니다.

9. 볼린저 밴드 설정
-------------------
useBollinger: true
bollingerPeriod: 60
bollingerStdDev: 1

설명:
- useBollinger: 
  true로 설정하면 볼린저 밴드를 사용하여 거래 신호를 생성합니다.

- bollingerPeriod: 
  볼린저 밴드 계산에 사용할 기간(캔들 수)입니다.

- bollingerStdDev: 
  표준편차의 배수입니다. 보통 2로 설정합니다.

설정 방법:
가격의 변동성을 고려하여 거래하고 싶다면 useBollinger를 true로 설정하세요.
더 넓은 밴드를 원한다면 bollingerStdDev를 높게 설정하세요.

10. PSAR 설정
-------------
usePSAR: true
psarStep: 0.02
psarMaxStep: 0.2

설명:
- usePSAR: 
  true로 설정하면 PSAR(Parabolic Stop and Reverse) 지표를 사용합니다.

- psarStep: 
  PSAR의 Step 값입니다. 작을수록 민감하게 반응합니다.

- psarMaxStep: 
  PSAR의 최대 Step 값입니다.

설정 방법:
추세의 전환점을 감지하여 거래하고 싶다면 usePSAR를 true로 설정하세요.
더 민감한 반응을 원한다면 psarStep을 낮게 설정하세요.

11. RSI 설정
------------
useRSI: true
rsiPeriod: 60
rsiBuyThreshold: 30
rsiSellThreshold: 70

설명:
- useRSI: 
  true로 설정하면 RSI(Relative Strength Index) 지표를 사용합니다.

- rsiPeriod: 
  RSI 계산에 사용할 기간(캔들 수)입니다.

- rsiBuyThreshold: 
  이 값 이하일 때 매수 신호로 간주합니다.

- rsiSellThreshold: 
  이 값 이상일 때 매도 신호로 간주합니다.

설정 방법:
과매수, 과매도 상황을 판단하여 거래하고 싶다면 useRSI를 true로 설정하세요.
보수적인 전략을 원한다면 rsiBuyThreshold를 낮게, rsiSellThreshold를 높게 설정하세요.

12. 마켓 필터링 설정
--------------------
isTargetInclude24Price: true
isTargetInclude24Volume: true
isTargetIncludeChkClosingPrice: true
targetMarketMaxSize: 30

설명:
- isTargetInclude24Price: 
  true로 설정하면 24시간 거래 금액을 기준으로 마켓을 필터링합니다.

- isTargetInclude24Volume: 
  true로 설정하면 24시간 거래량을 기준으로 마켓을 필터링합니다.

- isTargetIncludeChkClosingPrice: 
  true로 설정하면 현재가가 전일 종가보다 높은 마켓만 선택합니다.

- targetMarketMaxSize: 
  분석할 최대 마켓 수입니다.

설정 방법:
거래가 활발한 코인만 선택하고 싶다면 isTargetInclude24Price와 isTargetInclude24Volume을 
true로 설정하세요.
상승 중인 코인만 선택하고 싶다면 isTargetIncludeChkClosingPrice를 true로 설정하세요.
분석할 코인의 수를 제한하고 싶다면 targetMarketMaxSize를 원하는 값으로 설정하세요.
14. 일일 구매 제한 및 로그 설정
-------------------------------
enableDailyPurchaseLimit: true
dailyPurchaseLimit: 3
purchaseLogFile: "purchase_log.json"

설명:
- enableDailyPurchaseLimit: 
  true로 설정하면 일일 구매 횟수 제한을 활성화합니다.

- dailyPurchaseLimit: 
  하루에 허용되는 최대 구매 횟수입니다.

- purchaseLogFile: 
  구매 기록을 저장할 JSON 파일의 이름입니다.

설정 방법:
1. enableDailyPurchaseLimit를 true로 설정하여 일일 구매 제한을 활성화하세요.
2. dailyPurchaseLimit에 원하는 일일 최대 구매 횟수를 입력하세요.
3. purchaseLogFile에 구매 기록을 저장할 파일 이름을 입력하세요. 
   확장자는 반드시 .json이어야 합니다.

주의사항:
1. 프로그램이 실행되는 디렉토리에 쓰기 권한이 있는지 확인하세요.
2. 파일 이름에 특수 문자나 공백을 사용하지 마세요.
3. 프로그램 실행 중 로그 파일이 생성되지 않으면 콘솔 로그를 확인하여 
   오류 메시지를 확인하세요.
4. 로그 파일은 프로그램이 실행되는 동일한 디렉토리에 생성됩니다.

문제 해결:
- 로그 파일이 생성되지 않는 경우:
  1. 콘솔 로그에서 파일 저장 관련 오류 메시지를 확인하세요.
  2. 프로그램 실행 디렉토리의 쓰기 권한을 확인하세요.
  3. 안티바이러스 프로그램이 파일 생성을 차단하고 있지 않은지 확인하세요.
  4. 다른 프로그램이 같은 이름의 파일을 사용 중이지 않은지 확인하세요.

설정 예시:
enableDailyPurchaseLimit: true
dailyPurchaseLimit: 5
purchaseLogFile: "my_crypto_purchases.json"

이 설정은 하루 최대 5번의 구매를 허용하고, 구매 기록을 "my_crypto_purchases.json" 
파일에 저장합니다.