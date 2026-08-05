import{a_ as n,aw as R}from"./iframe-DT5QZXTQ.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-C8kBpWFn.js";import{P as H}from"./project-modal-BfvwlYpI.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Bmt_wjVH.js";import"./Select-ef7c0426.esm-y4dwAMzX.js";import"./chevron-down-0YfKdima.js";import"./check-BdEux5vg.js";import"./export-menu-8NELiuOJ.js";import"./client-B5k92456.js";import"./markdown-preview-yARCG_tI.js";import"./index.dom-D_wTd2ti.js";import"./file-text-C719jH1q.js";import"./copy-BHN1kH2p.js";import"./file-code-corner-BIA0GnAV.js";import"./loader-circle-B4NYgb3Z.js";import"./api-BSqEXogR.js";import"./folder-open-BjFbGXOU.js";import"./folder-hSbMXSEE.js";import"./tag-color-picker-DDh36-hl.js";import"./project-tag-DmZ4XXLZ.js";import"./sparkles-B8WBhQEH.js";import"./brain-DbnISs5w.js";import"./chevron-right-BPZFIBBj.js";import"./markdown-editor-DSMeD9qd.js";import"./pencil-BmDLe8NE.js";import"./trash-2-Bg75s_2N.js";import"./templates-BNS19VfM.js";import"./project-template-labels-B65cKjAd.js";import"./plus-CPir_CxS.js";import"./task-row-D2mVILkk.js";import"./blocked-badge-DvS6m2rT.js";import"./selectable-icon-BnVmc5BK.js";import"./hover-expand-button-CNu2ET2q.js";import"./index-C65WNkkZ.js";import"./data-refresh-Cl4WClmM.js";import"./rotate-ccw-TXsguaVj.js";import"./play-zEBxG9uX.js";import"./square-terminal-C0PAcmh9.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-CzS0FTsa.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
