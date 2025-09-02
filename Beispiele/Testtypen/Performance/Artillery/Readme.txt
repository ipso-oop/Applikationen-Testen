Artillery installieren:
npm init -y
npm install artillery --save-dev

Test ausführen:
npx artillery run artillery-test.yml

npx artillery run artillery-test-load.yml --record --key <api-key-artillery-cloud>
