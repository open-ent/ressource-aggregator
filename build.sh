#!/bin/bash

# Clean files
echo -e '\n------------------'
echo 'Clean before build'
echo '------------------'
cd backend
rm -rf ./.gradle
rm -rf ./build
rm -rf ./gradle
rm -rf ./src/main/resources/public
rm -rf ./src/main/resources/view
echo 'Repo clean for build !'
cd ..

# Frontend
echo -e '\n--------------'
echo 'Build Frontend'
echo '--------------'
cd frontend
#./build.sh --no-docker clean init build
./build.sh installDeps build
cd ..

# Create directory structure and copy frontend dist
echo -e '\n--------------------'
echo 'Copy front files built'
echo '----------------------'
cd backend
cp -R ../frontend/dist/* ./src/main/resources

# Create view directory and copy HTML files into Backend
mkdir -p ./src/main/resources/view
mkdir -p ./src/main/resources/public/template
mkdir -p ./src/main/resources/public/img
mkdir -p ./src/main/resources/public/js
mv ./src/main/resources/*.html ./src/main/resources/view

# Copy all public files from frontend into Backend
cp -R ../frontend/public/* ./src/main/resources/public
echo 'Files all copied !'

# Build .
echo -e '\n-------------'
echo 'Build Backend'
echo '-------------'
#./build.sh --no-docker clean build
./build.sh clean build

# Clean up - remove compiled files in front folders
echo -e '\n-------------'
echo 'Clean front folders'
echo '-------------'
rm -rf ../frontend/dist
echo 'Folders cleaned !'