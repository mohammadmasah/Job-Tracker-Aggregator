import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { createApplication, updateApplication } from "./application.js";

test("create and update send form values as JSON with credentials enabled", async () => {
    const original = axios.defaults.adapter;
    const requests = [];
    axios.defaults.adapter = async (config) => {
        requests.push(config);
        return { data: { id: 12 }, status: 200, statusText: "OK", headers: {}, config };
    };
    try {
        const application = { company: "Acme", position: "Développeur React", status: "applied", applied_at: "2026-09-27" };
        await createApplication(application);
        await updateApplication(12, { status: "interview", notes: "Entretien mardi" });
        assert.equal(requests[0].url, "/api/applications");
        assert.equal(requests[0].method, "post");
        assert.deepEqual(JSON.parse(requests[0].data), application);
        assert.equal(requests[1].url, "/api/applications/12");
        assert.equal(requests[1].method, "patch");
        assert.deepEqual(JSON.parse(requests[1].data), { status: "interview", notes: "Entretien mardi" });
        assert.ok(requests.every((request) => request.withCredentials === true));
    } finally {
        axios.defaults.adapter = original;
    }
});
