1. 프로그램목적
- 특정시점에 코인을 사는 프로그램
2. 실행방법은 config.json 파일을 수정합니다
3. config.json
   "access_key": "업비트 키 값 설정",
   "secret_key": "업비트 키 값 설정",
   "targetMarket": "BTC", 구매할 코인명을 입력한다.
   "sellIfBuyPriceIsHigherThan": 78140000, 이 값 이상면 산다.
   "sellIfBuyPriceIsLowerThan": 3159300,  이 값 하면 산다 
  "invest": 10000 투자금액은 1만원으로 한다.