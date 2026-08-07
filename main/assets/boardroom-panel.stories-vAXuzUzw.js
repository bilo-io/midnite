import{a_ as T}from"./iframe-B6cRdJCM.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-DselcK0M.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BipSqL2y.js";import"./Select-ef7c0426.esm-BH9cx8k0.js";import"./chevron-down-DweBmCCR.js";import"./check-C7pJxc8-.js";import"./project-tag-BBeJ_8ru.js";import"./project-modal-BoMWbKTQ.js";import"./export-menu-DT-BaZ-U.js";import"./client-DiRQJrAn.js";import"./markdown-preview-ff_J7qqL.js";import"./index.dom-D_wTd2ti.js";import"./copy-5BLt8naZ.js";import"./file-code-corner-D7FtTg1b.js";import"./file-text-Bc03BaXB.js";import"./loader-circle-DaWjWJgy.js";import"./api-BHtk7Id1.js";import"./folder-open-NbSdrTHa.js";import"./folder-FGQLJUSM.js";import"./tag-color-picker-ByAGGhyf.js";import"./sparkles-BTwB37ji.js";import"./brain-pu0lifYY.js";import"./chevron-right-B9ZNuUG7.js";import"./markdown-editor-BupmOr7c.js";import"./pencil-CqHWz4e9.js";import"./trash-2-MblEG_yZ.js";import"./confirm-dialog-BDaediIW.js";import"./templates-D1WPLEpr.js";import"./project-template-labels-DBpRnK1X.js";import"./plus-B-FK_vFL.js";import"./task-row-CIMTJHnB.js";import"./blocked-badge-ClgzRJqn.js";import"./selectable-icon-eA7jNt2M.js";import"./hover-expand-button-CuHGEGHg.js";import"./index-BnOW1lP7.js";import"./data-refresh-C-RJmF0E.js";import"./rotate-ccw-D0MhkyL2.js";import"./play-CEB3hd8A.js";import"./square-terminal-CggTgj4h.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-Cp-wysUh.js";import"./spinner-C2vlqNWv.js";import"./task-route-D70_7rUP.js";import"./use-api-data-Bsm1motO.js";import"./useQuery-Cqr84x33.js";import"./presentation-D91Xdb2p.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
