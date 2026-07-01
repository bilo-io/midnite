import{n as T}from"./iframe-DJr7qVNo.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-CM5yk3CV.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-bZvbO2wZ.js";import"./index-Dl4JnYVx.js";import"./check-Dt-62BLG.js";import"./project-tag-bB-RAwE0.js";import"./inbound-CbJZzwyX.js";import"./project-modal-BjlbSumd.js";import"./export-menu-DHvOc43v.js";import"./client-Dv1LRy6x.js";import"./markdown-preview-BiHh0Dwj.js";import"./file-text-BUe7PTSA.js";import"./copy-BM-gubhb.js";import"./loader-circle-CNyT3gS4.js";import"./api-A95bhGP6.js";import"./folder-open-CDLUVd45.js";import"./folder-DPtLpD5Y.js";import"./tag-color-picker-Ph4QdwZF.js";import"./source-list-editor-CbX1o7CU.js";import"./confirm-dialog-GvMHw0gE.js";import"./triangle-alert-B0ot2rUY.js";import"./source-icon-CZYHKUIe.js";import"./globe-DW0-XAJU.js";import"./sticky-note-BjV0VPoG.js";import"./plus-BUkWHpwP.js";import"./external-link-WX1qcCE-.js";import"./task-row-B6PXyo2y.js";import"./blocked-badge-B7FTUDKR.js";import"./selectable-icon-t4xopNAV.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-CL77Ypbm.js";import"./pencil-DN81iz8s.js";import"./trash-2-Hfr4bbmI.js";import"./refresh-cw-DUQe2k9R.js";import"./index-C2gaUvt5.js";import"./lightbulb-D1zEPwuN.js";import"./templates-B6M1OYb3.js";import"./sparkles-Hwb-6odb.js";import"./brain-BWNMJhzL.js";import"./chevron-right-CpJxdig4.js";import"./spinner-B28LcHu3.js";import"./data-refresh-CNr_iQS4.js";import"./useQuery-Cvmbt2gd.js";import"./presentation-BVMAOZnt.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,Bt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await o.findByText(x.name)).toBeInTheDocument(),await n(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: [project, projectMinimal]
  }, {
    match: '/tasks',
    json: tasks
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('heading', {
      name: 'Board Room'
    })).toBeInTheDocument();
    // The project list loads asynchronously (Promise.all of three endpoints).
    await expect(await canvas.findByText(project.name)).toBeInTheDocument();
    await expect(canvas.getByText(projectMinimal.name)).toBeInTheDocument();
  }
}`,...(i=e.parameters)===null||i===void 0||(m=i.docs)===null||m===void 0?void 0:m.source},description:{story:"The projects hub: a row per active project, with its task count.",...(p=e.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.description}}};a.parameters={...a.parameters,docs:{...(l=a.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: []
  }, {
    match: '/tasks',
    json: []
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No projects yet.')).toBeInTheDocument();
  }
}`,...(h=a.parameters)===null||h===void 0||(d=h.docs)===null||d===void 0?void 0:d.source},description:{story:"No projects → the empty-state message.",...(u=a.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.description}}};r.parameters={...r.parameters,docs:{...(_=r.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    status: 500
  }, {
    match: '/tasks',
    json: []
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/Couldn’t load projects/)).toBeInTheDocument();
  }
}`,...(y=r.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=r.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Tt=["Default","Empty","Error"];export{e as Default,a as Empty,r as Error,Tt as __namedExportsOrder,Bt as default};
