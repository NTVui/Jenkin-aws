pipeline {
    agent any

    options {
        disableConcurrentBuilds()
    }

    environment {
        DOCKER_IMAGE = "vui101/sample-ci-app"
        DEPLOYMENT_FILE = "k8s/deployment.yaml"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('CI/CD Pipeline') {
            steps {
                script {
                    def commitMessage = sh(
                        script: 'git log -1 --pretty=%B',
                        returnStdout: true
                    ).trim()

                    def changedFiles = sh(
                        script: 'git show --pretty="" --name-only HEAD',
                        returnStdout: true
                    ).trim()

                    echo "Commit message: ${commitMessage}"
                    echo "Changed files: ${changedFiles}"

                    if (commitMessage.contains('[skip ci]')) {
                        currentBuild.description = "Skipped GitOps manifest commit"
                        echo "Phát hiện [skip ci]. Dừng pipeline để tránh vòng lặp."
                        return
                    }

                    def files = changedFiles.split('\n')
                        .collect { it.trim() }
                        .findAll { it }

                    def onlyK8sChanged = !files.isEmpty() &&
                        files.every { it.startsWith('k8s/') }

                    if (onlyK8sChanged) {
                        currentBuild.description = "Skipped k8s-only commit"
                        echo "Commit chỉ thay đổi thư mục k8s/. Dừng pipeline."
                        return
                    }

                    stage('Install dependencies') {
                        sh '''
                            docker run --rm \
                              -v "$WORKSPACE/jenkins-ci-lab":/app \
                              -w /app \
                              node:20-alpine npm install
                        '''
                    }

                    stage('Test') {
                        sh '''
                            docker run --rm \
                              -v "$WORKSPACE/jenkins-ci-lab":/app \
                              -w /app \
                              node:20-alpine npm test
                        '''
                    }

                    stage('Build Docker image') {
                        sh '''
                            docker build \
                              -t ${DOCKER_IMAGE}:${BUILD_NUMBER} \
                              -t ${DOCKER_IMAGE}:latest .
                        '''
                    }

                    stage('Push Docker image') {
                        withCredentials([usernamePassword(
                            credentialsId: 'dockerhub',
                            usernameVariable: 'DOCKERHUB_USERNAME',
                            passwordVariable: 'DOCKERHUB_TOKEN'
                        )]) {
                            sh '''
                                echo "$DOCKERHUB_TOKEN" | docker login \
                                  -u "$DOCKERHUB_USERNAME" --password-stdin
                                docker push ${DOCKER_IMAGE}:${BUILD_NUMBER}
                                docker push ${DOCKER_IMAGE}:latest
                                docker logout
                            '''
                        }
                    }

                    stage('Update Kubernetes manifest') {
                        sh '''
                            sed -i \
                              "s|image: ${DOCKER_IMAGE}:.*|image: ${DOCKER_IMAGE}:${BUILD_NUMBER}|" \
                              ${DEPLOYMENT_FILE}
                            grep "image:" ${DEPLOYMENT_FILE}
                        '''
                    }

                    stage('Push manifest to GitHub') {
                        withCredentials([usernamePassword(
                            credentialsId: 'github-pat',
                            usernameVariable: 'GITHUB_USERNAME',
                            passwordVariable: 'GITHUB_TOKEN'
                        )]) {
                            sh '''
                                git config user.name "Jenkins CI"
                                git config user.email "jenkins@example.local"
                                git add ${DEPLOYMENT_FILE}

                                if git diff --cached --quiet; then
                                    echo "Manifest không thay đổi."
                                else
                                    git commit -m "Update image to ${DOCKER_IMAGE}:${BUILD_NUMBER} [skip ci]"
                                    git push "https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/NTVui/Jenkin-aws.git" HEAD:main
                                fi
                            '''
                        }
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline hoàn thành hoặc được bỏ qua an toàn."
        }
        failure {
            echo "Pipeline thất bại. Kiểm tra Console Output."
        }
        always {
            sh 'docker image prune -f || true'
        }
    }
}

