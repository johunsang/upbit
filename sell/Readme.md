1. 프로그램목적
- 특정시점에 코인을 파는 프로그램
2. 실행방법은 config.json 파일을 수정합니다
3. config.json
   "access_key": "업비트 키 값 설정",
   "secret_key": "업비트 키 값 설정",
   "margin_percent": 1, - 이 값만큼 마진(이익)이 날 경우
   "margin_volume_percent": 50, - 얼마만큼 판매 % 
   "stopLoss_percent": -1,  - 이 값아래로 떨어지면 -1%가 되면 무조건 파내
   "stopLoss_volume_percent": 100, - 100% 다 판다.
   "exclude_markets": "BTC", - 판매 제외하는 마켓 콤마로 복수가 추가가 가능
   "isLoveMyMarkets": true, - 요 값만 팔떄 
   "myLovelyMarkets": "BTC" -BTC만 판매를 합니다