from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_health_retorna_status_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_version_retorna_nome_e_versao_do_app():
    response = client.get("/version")
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "gitlab-flow-demo"
    assert body["version"]


def test_root_retorna_mensagem_de_boas_vindas():
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["app"] == "gitlab-flow-demo"
    assert "Olá, mundo" in body["message"]
