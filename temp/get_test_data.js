const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyANJZ18QYGCRJv0SHgLuu0k904jg_-sW-U",
  authDomain: "shutterstudio-webapp.firebaseapp.com",
  projectId: "shutterstudio-webapp",
  storageBucket: "shutterstudio-webapp.firebasestorage.app",
  messagingSenderId: "54922171664",
  appId: "1:54922171664:web:49f47ab38915d469864195"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const docRef = doc(db, "Studios", "STU_ef48a2");
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    console.log("Studio Data:", JSON.stringify(snap.data(), null, 2));
  } else {
    console.log("Studio not found.");
  }
}

main().catch(console.error);
