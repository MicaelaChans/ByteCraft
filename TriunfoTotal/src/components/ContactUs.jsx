import Footer from "./partials/Footer";
import "../css/ContactUs.css";
function ContactUs() {
  return (
    <>
      <section id="sectionContact1">
        <div className="container">
          <div>
            <h2 className="fs-1">Contact us</h2>
            <p className="mt-4 fs-5">
              Lorem ipsum dolor sit amet consectetur adipisicing elit.
              Praesentium, excepturi.
            </p>
          </div>
        </div>
      </section>
      <section id="sectionContact2">
        <div className="container py-5">
          <h3>Lorem ipsum dolor sit, amet consectetur adipisicing elit.</h3>
          <p className="mt-4">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Autem
            dignissimos harum possimus commodi dolores vero ab? Unde architecto
            accusantium nesciunt necessitatibus, odit quae qui quam quos
            explicabo laborum repellat deserunt.
          </p>
          <div className="form-box mt-5 py-3 d-flex justify-content-center align-items-center">
            <form action="">
              <h2>Lorem</h2>
              <div className="row">
                <div className="col-lg-6 col-md-6 col-sm-12">
                  <div className="inputbox">
                    <input type="text" name="firstname" required />
                    <label>Firstname</label>
                  </div>
                  <div className="inputbox">
                    <input type="text" name="Lastname" required />
                    <label>Lastname</label>
                  </div>
                  <div className="inputbox">
                    <input type="text" name="email" required />
                    <label>Email</label>
                  </div>
                  <div className="inputbox">
                    <input type="text" name="phone" required />
                    <label>Phone</label>
                  </div>
                </div>
                <div className="col-lg-6 col-md-6 col-sm-12">
                  <div className="inputbox">
                    <input type="text" name="subjet" required />
                    <label>Subjet</label>
                  </div>
                  <div className="d-flex flex-column">
                    <label>Comentary</label>
                    <textarea
                      className="border-2 border-black mt-3"
                      name="comentary"
                      id="comentary"
                      cols="40"
                      rows="4"
                    ></textarea>
                  </div>
                  <div className="form-check mt-3">
                    <input
                      className="form-check-input bg-black border-0"
                      type="checkbox"
                      name="flexCheckDefault"
                      id="flexCheckDefault"
                      value=""
                      required
                    />
                    <label
                      className="form-check-label"
                      htmlFor="flexCheckDefault"
                    >
                      I consent to the terms of the privacy politic.
                    </label>
                  </div>
                  <div className="d-flex justify-content-end aling-items-end mt-3">
                    <button className="btn btn-dark">Send</button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
export default ContactUs;
