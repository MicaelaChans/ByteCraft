import { useState, useRef, useMemo } from "react";
import Footer from "./partials/Footer";
import "../css/styles.css";

function Policies() {
    return (    
        <>
        <section id="sectionPolicies1">
            <div className="container py-5">
                <div>
                    <h2 className="fs-1">Políticas de Privacidad</h2>
                    <p className="mt-4 fs-5">
                        Lorem ipsum dolor sit amet consectetur, adipisicing elit. Rem quo cumque soluta ullam fuga voluptatem doloribus vel repellendus repudiandae ad atque, dolores reprehenderit blanditiis. Facilis alias nulla corporis quia, tempora neque ea distinctio ipsam error soluta, excepturi voluptatum possimus. Adipisci natus repellat ipsum excepturi molestias sunt at quisquam quos recusandae!
                    </p>
                </div>
            </div>
        </section>

        <section id="sectionPolicies2 mt-5">
            <div className="container py-5">
                <h2>Políticas de Privacidad - Triunfo Total (ByteForge)</h2>
                <h4>Última actualización: Julio de 2026</h4>
                <br />
                <h5>1. Declaración de Compromiso y Marco Legal:</h5>
                <p>
                    La empresa desarrolladora ByteForge, creadora de Triunfo Total, asume el compromiso de proteger y garantizar la confidencialidad 
                    de la información y los datos personales de todos nuestros usuarios (administradores, deportistas, árbitros y espectadores).
                    El tratamiento de los datos personales se realiza en estricto cumplimiento con la legislación de la República Oriental del Uruguay, 
                    específicamente bajo la Ley Nº 18.331 de Protección de Datos Personales y Acción de "Habeas Data", su reglamentación y demás normas concordantes.
                </p>
                <br />
                <h5>2. Datos Obtenidos y Finalidad del Tratamiento:</h5>
                <p>
                    A través del uso del SGDM, se recopilan los siguientes datos mínimos con propósitos exclusivamente relacionados con el funcionamiento
                    del software:Datos de Registro: Nombre, apellido, dirección de correo electrónico, documento de identidad (en caso de competidores) y contraseñas. Datos Deportivos: Estadísticas de juego, 
                    torneos en los que participa, puntajes, sanciones e historial deportivo dentro de la plataforma.
                </p>
                <br />
                <p>
                    Finalidad: La recolección de estos datos tiene como única meta la correcta administración de las competencias deportivas, la autenticación segura en la plataforma y la generación 
                    transparente de los resultados deportivos.
                    Nota sobre Seguridad: Las contraseñas de acceso son almacenadas en nuestra base de datos cifradas mediante algoritmos de hash unidireccionales seguros de grado industrial ($BCRYPT$), 
                    impidiendo su lectura en texto plano incluso para los administradores del sistema.
                </p>
                <br />
                <h5>3. Consentimiento del Usuario:</h5>
                <p>
                    3. Consentimiento del Usuario: Al registrarse y crear una cuenta en Triunfo Total, el usuario otorga su consentimiento expreso, libre e informado para que ByteForge realice el tratamiento 
                    de sus datos de acuerdo con los fines estipulados en este documento.
                </p>
                <br />
                <h5>4. Derechos de los Titulares (Derechos ARCO):</h5>
                <p>
                    De acuerdo con la Ley Nº 18.331, todos los usuarios tienen el derecho absoluto a ejercer el control sobre sus datos personales. 
                    Para ello, garantizamos los siguientes derechos:
                    Acceso: Conocer qué datos personales tenemos en nuestras bases de datos.
                    Rectificación / Actualización: Solicitar la corrección de datos inexactos, incompletos o desactualizados.
                    Cancelación / Eliminación: Solicitar la supresión de sus datos de nuestros registros cuando no exista una obligación legal o contractual que lo impida.
                    Oposición: Oponerse al tratamiento de sus datos para fines específicos.Para ejercer cualquiera de estos derechos, los usuarios pueden ponerse en contacto con la administración de ByteForge enviando una solicitud formal a: Bytecraftsoftware.2026@gmail.com.
                </p>
                <br />
                <h5>5. Medidas de Seguridad de la Información:</h5>
                <p>
                    Para evitar el acceso no autorizado, la alteración, pérdida o tratamiento indebido de la información, ByteForge aplica un enfoque de seguridad en profundidad que incluye: Aislamiento perimetral de la base de datos 
                    en una red interna privada de contenedores Docker sin exposición directa a internet.
                    Uso de sentencias preparadas (PDO) en el Backend (PHP) para mitigar vectores de ataque por inyección SQL ($SQLi$).
                    Políticas de respaldo automatizadas mediante scripts programados en el sistema operativo del servidor.
                </p>    
            </div>
        </section>

        <Footer />  
        </>
    );
}        
export default Policies;