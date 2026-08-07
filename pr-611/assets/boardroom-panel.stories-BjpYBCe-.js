import{b1 as T}from"./iframe-BH5Vu7l0.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-Bh25wQAl.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CZ1fkoJS.js";import"./Select-ef7c0426.esm-CEOiQR-w.js";import"./chevron-down-CKuwVSNh.js";import"./check-CwJYw9in.js";import"./project-tag-B6rdhKlb.js";import"./project-modal-BmpBKGnV.js";import"./export-menu-DKn1a0s-.js";import"./client-PTfR8Q-c.js";import"./markdown-preview-Dj0hk5M4.js";import"./index.dom-D_wTd2ti.js";import"./copy-CiEJefyb.js";import"./file-code-corner-cMCiIy_h.js";import"./file-text-DX3T7lxH.js";import"./loader-circle-BbPBstPe.js";import"./api-BnZ-InWP.js";import"./folder-open-vhHGbrgT.js";import"./folder-D4SYY6tq.js";import"./tag-color-picker-oSOv-nfi.js";import"./sparkles-nP1Yqm9-.js";import"./brain-CIBh3drD.js";import"./chevron-right-B9t_4A2h.js";import"./markdown-editor-DwJs9ALQ.js";import"./pencil-DNW-Qv3M.js";import"./trash-2-Bjf3jMDW.js";import"./confirm-dialog-CttaH42l.js";import"./templates-C-27Q0_o.js";import"./project-template-labels-CXC81YpB.js";import"./plus-DQUXpXnc.js";import"./task-row-u8Ns_NSK.js";import"./blocked-badge-D58i74ty.js";import"./selectable-icon-Bm0dbH3I.js";import"./hover-expand-button-DYPPJxWH.js";import"./index-CqsZ_EAC.js";import"./data-refresh-CdkjdyD7.js";import"./rotate-ccw-DyjD-Gco.js";import"./play-BEuaqbtD.js";import"./square-terminal-D9pu7IxS.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-D3-uo56Y.js";import"./spinner-DQ82Gi6A.js";import"./task-route-D70_7rUP.js";import"./use-api-data-BLuWX40F.js";import"./useQuery-DgEZuiGZ.js";import"./presentation-ClcqBsif.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: {
      items: [project, projectMinimal],
      total: 2
    }
  }, {
    match: '/tasks',
    json: {
      items: tasks,
      total: tasks.length
    }
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
    json: {
      items: [],
      total: 0
    }
  }, {
    match: '/tasks',
    json: {
      items: [],
      total: 0
    }
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
}`,...(h=a.parameters)===null||h===void 0||(d=h.docs)===null||d===void 0?void 0:d.source},description:{story:"No projects → the empty-state message.",...(u=a.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.description}}};n.parameters={...n.parameters,docs:{...(_=n.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    status: 500
  }, {
    match: '/tasks',
    json: {
      items: [],
      total: 0
    }
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
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Dt=["Default","Empty","Error"];export{e as Default,a as Empty,n as Error,Dt as __namedExportsOrder,xt as default};
