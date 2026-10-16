<?php
// app/core/Modelo.php
//
// Clase base de los MODELOS: son los únicos que hablan con la base.
// Todas las consultas usan sentencias preparadas (parámetros "?"),
// nunca concatenamos datos del usuario dentro del SQL.

abstract class Modelo {
    protected PDO $db;

    public function __construct() {
        $this->db = Conexion::getConexion();
    }

    protected function uno(string $sql, array $params = []): array|false {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch();
    }

    protected function todos(string $sql, array $params = []): array {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    protected function ejecutar(string $sql, array $params = []): int {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    protected function valor(string $sql, array $params = []) {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchColumn();
    }

    /** Ejecuta varias operaciones como una sola transacción (todo o nada). */
    public function transaccion(callable $fn) {
        $propia = !$this->db->inTransaction();
        if ($propia) $this->db->beginTransaction();
        try {
            $resultado = $fn();
            if ($propia) $this->db->commit();
            return $resultado;
        } catch (Throwable $e) {
            if ($propia && $this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }
}
