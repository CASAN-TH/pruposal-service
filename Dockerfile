FROM node:latest

COPY . /src

WORKDIR /src

RUN apt-get update && apt-get install -y \
	python-dev libxml2-dev libxslt1-dev antiword poppler-utils \
	python-pip zlib1g-dev

RUN npm install --production

EXPOSE 3000

CMD npm start