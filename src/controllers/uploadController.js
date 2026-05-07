export async function uploadProcess(req, res) {
  try {
    // 🎯 FAKE DATA FOR DEMO
    const notes = {
      summary: "The session explained how to use Zoom features like polling, meeting creation, and participant engagement effectively.",
      key_concepts: [
        "Zoom polling system",
        "Meeting setup process",
        "Participant interaction",
        "Practice meetings",
        "Automated voting system"
      ]
    };

    res.render("dashboard", { notes });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
};