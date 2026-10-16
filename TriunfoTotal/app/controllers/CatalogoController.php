<?php
// app/controllers/CatalogoController.php — datos públicos de referencia

class CatalogoController extends Controlador {

    /** GET /disciplinas */
    public function disciplinas(): void {
        $this->ok((new Catalogo())->disciplinas());
    }

    /** GET /modulos */
    public function modulos(): void {
        $this->ok((new Catalogo())->modulos());
    }
}
