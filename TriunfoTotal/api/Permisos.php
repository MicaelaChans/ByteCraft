<?php
// config/Permisos.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/Conexion.php';

class Permisos {

    /**
     * Verifica si el usuario autenticado es Admin General de la plataforma
     */
    public static function esAdminGlobal(): bool {
        return isset($_SESSION['es_admin']) && ($_SESSION['es_admin'] == 1 || $_SESSION['es_admin'] === true);
    }

    /**
     * Verifica si el usuario activo es el Organizador del torneo específico
     */
    public static function esOrganizadorDelTorneo(int $idTorneo): bool {
        if (!isset($_SESSION['id_usuario'])) {
            return false;
        }

        // El Admin General tiene acceso total por defecto
        if (self::esAdminGlobal()) {
            return true;
        }

        $db = Conexion::getConexion();
        $stmt = $db->prepare("SELECT id_organizador FROM torneos WHERE id_torneo = ? LIMIT 1");
        $stmt->execute([$idTorneo]);
        $torneo = $stmt->fetch();

        return $torneo && ($torneo['id_organizador'] == $_SESSION['id_usuario']);
    }

    /**
     * Middleware helper para bloquear acceso en endpoints restringidos
     */
    public static function exigirOrganizador(int $idTorneo): void {
        if (!self::esOrganizadorDelTorneo($idTorneo)) {
            http_response_code(403);
            echo json_encode(['error' => 'Acceso denegado: No tienes permisos de organizador en este torneo.']);
            exit;
        }
    }
}