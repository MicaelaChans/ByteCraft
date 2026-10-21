<?php
// app/models/Seguidor.php
//
// MODELO de seguidores (tabla seguidores: quién sigue a quién).
// Sirve para que, cuando un organizador publica un torneo, les llegue
// un aviso a todas las personas que lo siguen.

class Seguidor extends Modelo {

    /** Seguir es idempotente: si ya lo seguía, no pasa nada (INSERT IGNORE). Devuelve true si es nuevo. */
    public function seguir(int $idSeguidor, int $idSeguido): bool {
        return $this->ejecutar('INSERT IGNORE INTO seguidores (id_seguidor, id_seguido) VALUES (?, ?)',
            [$idSeguidor, $idSeguido]) > 0;
    }

    public function dejarDeSeguir(int $idSeguidor, int $idSeguido): void {
        $this->ejecutar('DELETE FROM seguidores WHERE id_seguidor = ? AND id_seguido = ?', [$idSeguidor, $idSeguido]);
    }

    public function sigue(int $idSeguidor, int $idSeguido): bool {
        return $this->uno('SELECT 1 FROM seguidores WHERE id_seguidor = ? AND id_seguido = ?', [$idSeguidor, $idSeguido]) !== false;
    }

    public function cantidadSeguidores(int $idUsuario): int {
        return (int)$this->valor('SELECT COUNT(*) FROM seguidores WHERE id_seguido = ?', [$idUsuario]);
    }

    public function cantidadSeguidos(int $idUsuario): int {
        return (int)$this->valor('SELECT COUNT(*) FROM seguidores WHERE id_seguidor = ?', [$idUsuario]);
    }

    /** Personas que sigue un usuario (para "A quiénes sigo" en el perfil). */
    public function seguidosPor(int $idUsuario): array {
        return $this->todos(
            "SELECT u.id_usuario, u.nombre, u.apellido, u.alias, u.avatar
               FROM seguidores s JOIN usuarios u ON u.id_usuario = s.id_seguido
              WHERE s.id_seguidor = ? AND u.estado = 'Activo'
              ORDER BY u.nombre", [$idUsuario]);
    }
}
