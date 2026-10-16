<?php
// app/models/Auditoria.php
//
// MODELO de auditoría. Los INSERT/UPDATE/DELETE los registran los triggers;
// acá además se registran eventos de seguridad (login, login fallido, logout).

class Auditoria extends Modelo {

    public function evento(string $accion, ?int $idUsuario, string $descripcion): void {
        $this->ejecutar(
            "INSERT INTO auditoria (id_usuario, tabla_afectada, accion, descripcion, ip) VALUES (?, 'sesion', ?, ?, ?)",
            [$idUsuario, $accion, $descripcion, Sesion::ip()]);
    }

    public function listar(array $f, int $pagina = 1, int $porPagina = 50): array {
        $where = ['1 = 1'];
        $params = [];
        if (!empty($f['tabla']))  { $where[] = 'a.tabla_afectada = ?'; $params[] = $f['tabla']; }
        if (!empty($f['accion'])) { $where[] = 'a.accion = ?';         $params[] = $f['accion']; }
        if (!empty($f['desde']))  { $where[] = 'a.creado_en >= ?';     $params[] = $f['desde'] . ' 00:00:00'; }
        if (!empty($f['hasta']))  { $where[] = 'a.creado_en <= ?';     $params[] = $f['hasta'] . ' 23:59:59'; }
        if (!empty($f['usuario'])) {
            $where[] = '(u.email LIKE ? OR u.nombre LIKE ?)';
            $params[] = '%' . $f['usuario'] . '%';
            $params[] = '%' . $f['usuario'] . '%';
        }
        $condicion = implode(' AND ', $where);
        $offset = max(0, ($pagina - 1) * $porPagina);

        $total = (int)$this->valor("SELECT COUNT(*) FROM auditoria a LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario WHERE $condicion", $params);
        $filas = $this->todos(
            "SELECT a.*, u.email, CONCAT(u.nombre, ' ', COALESCE(u.apellido, '')) AS usuario
               FROM auditoria a LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
              WHERE $condicion
              ORDER BY a.id_auditoria DESC LIMIT $porPagina OFFSET $offset", $params);

        return ['registros' => $filas, 'total' => $total, 'pagina' => $pagina, 'por_pagina' => $porPagina];
    }

    public function tablas(): array {
        $stmt = $this->db->query('SELECT DISTINCT tabla_afectada FROM auditoria ORDER BY tabla_afectada');
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
}
