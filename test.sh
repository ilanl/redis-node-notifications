killall node
brew services stop redis
sleep 2
brew services start redis
sleep 2

current_dir=$(pwd)
REDIRECT_CONSOLE=1 NODE_ENV=development NODE_PORT=5000 REDIS_HOST=localhost REDIS_PORT=6379 node index.js &
sleep 2

t2=`echo $(date +%s%3)/10 | bc -l`
t2=${t2%.*}
t2=`echo $t2 + 15 | bc -l`

curl -G "http://localhost:5000/echoAtTime?time=${t2}" --data-urlencode "message=Todo3"

t1=`echo $(date +%s%3)/10 | bc -l`
t1=${t1%.*}
t1=`echo $t1 + 5 | bc -l`

curl -G "http://localhost:5000/echoAtTime?time=${t1}" --data-urlencode "message=Todo1"
curl -G "http://localhost:5000/echoAtTime?time=${t1}" --data-urlencode "message=Todo2"

sleep 7
brew services stop redis
sleep 20
brew services start redis
sleep 10

echo 'ok'