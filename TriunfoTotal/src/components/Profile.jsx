import "../css/profile.css";
import Footer from "./partials/Footer";
function Profile() {
  return (
    <>
      <div className="container mt-5">
        <h2>Profile</h2>
        <div className="container mt-5 p-5 border rounded shadow">
          <div
            className="container py-2 border rounded shadow"
            id="containerProfile"
          >
            <div className="row">
              <div className="col">
                <img
                  id="photoProfile"
                  src="https://static.vecteezy.com/system/resources/previews/014/194/215/original/avatar-icon-human-a-person-s-badge-social-media-profile-symbol-the-symbol-of-a-person-vector.jpg"
                  alt="photoProfile"
                />
              </div>
              <div className="col d-flex justify-content-end">
                <button className="border-0 bg-transparent rounded">
                  <i className="bi bi-pencil fs-4"></i>
                </button>
              </div>
            </div>
            <div className="row mt-3">
              <div className="col">
                <h6>Firsname: Micaela</h6>
                <h6>Lastname: Chans</h6>
                <h6>Email: micaelachansmoure@gmail.com</h6>
                <h6>Phone: 093827499</h6>
                <h6>Adress: Domingo Aramburu 2134</h6>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-8">
              <div className="container border rounded shadow mt-4 p-3">
                <h3>Change Password</h3>
                <form action="" className="d-flex flex-column fs-6 mt-4">
                  <label htmlFor="oldPassword">Old Password</label>
                  <input type="text" name="old" className="w-50 mt-2" />
                  <label htmlFor="newPassword">New Password</label>
                  <input type="text" name="new" className="w-50 mt-2" />
                  <label htmlFor="ConfirmPassword">Confirm New Password</label>
                  <input type="text" name="confirm" className="w-50 mt-2" />
                  <div className="d-flex justify-content-end">
                    <button className="btn btn-outline-dark">
                      Update Password
                    </button>
                  </div>
                </form>
              </div>
            </div>
            <div className="col d-flex justify-content-end align-items-end">
              <div className="container border rounded shadow mt-4 p-3">
                <h4>Danger Zone</h4>
                <div className="d-flex justify-content-end">
                  <button className="btn btn-outline-danger">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
export default Profile;
