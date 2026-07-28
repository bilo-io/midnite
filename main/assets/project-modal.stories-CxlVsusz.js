import{aX as n,ay as R}from"./iframe-CUlcPxi-.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-C386DNYw.js";import{P as H}from"./project-modal-oKBFccq1.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CQ-BkcQk.js";import"./Select-ef7c0426.esm-D1GiREd2.js";import"./chevron-down-C5UsFrop.js";import"./check-DKlmBT20.js";import"./index-K7Pm0ij0.js";import"./triangle-alert-Cvdnxc4T.js";import"./export-menu-BaVWH5La.js";import"./client-AymMeh9M.js";import"./markdown-preview-CvPmHGU-.js";import"./index.dom-D_wTd2ti.js";import"./file-text-C0M6XGzN.js";import"./copy-CnJyraY4.js";import"./file-code-corner-4vM5K6EA.js";import"./loader-circle-DnArweyU.js";import"./api-CdK8KWtp.js";import"./folder-open-3xhrNfP5.js";import"./folder-CJVHoWpF.js";import"./tag-color-picker-CPLPSRtR.js";import"./project-tag-CXp82O1s.js";import"./sparkles-B4eMafwM.js";import"./brain-DIaMu-E2.js";import"./chevron-right-BPQqbx_R.js";import"./markdown-editor-TsbnRAt6.js";import"./pencil-DECWDZaE.js";import"./trash-2-BCz3p7cp.js";import"./templates-Dwtczdxj.js";import"./plus-DXAvH1lU.js";import"./task-row-DhqlgMHF.js";import"./i18n-labels-6lVBTK6Q.js";import"./selectable-icon-oxyTrH4m.js";import"./hover-expand-button-BsgkuiuL.js";import"./index-6CmBilmO.js";import"./data-refresh-BlZ7vbGr.js";import"./rotate-ccw-DGa4Fl6P.js";import"./play-CHe8LFE8.js";import"./square-terminal-DI_Orv56.js";import"./task-columns-BUR8DOSo.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(m=o.parameters)===null||m===void 0||(l=m.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(d=i.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=i.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=i.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};r.parameters={...r.parameters,docs:{...(g=r.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const planTab = within(dialog).getByRole('tab', {
      name: /plan/i
    });
    await userEvent.click(planTab);
    await expect(planTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ha=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,ha as __namedExportsOrder,ja as default};
